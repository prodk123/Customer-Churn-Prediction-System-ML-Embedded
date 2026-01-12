import os
import json
from pathlib import Path
from typing import List
from uuid import uuid4

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

import crud
from database import get_db
from schemas import PredictionCreate, PredictionRead, ResultsResponse, UploadResponse
from services.ml_service import SchemaMismatchError, predict_churn


router = APIRouter()

WORKSPACE_DIR = Path(__file__).resolve().parents[2]
UPLOADS_DIR = Path(
    os.getenv(
        "CHURN_PLATFORM_UPLOADS_DIR",
        str((WORKSPACE_DIR / "data" / "churn_platform" / "uploads").resolve()),
    )
)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _extract_customer_ids(df: pd.DataFrame) -> List[str]:
    """Extract customer ids from known column names or fallback to row index."""
    for col in ["customer_id", "CustomerID", "customerID", "customerId", "CustomerId"]:
        if col in df.columns:
            return df[col].astype(str).fillna("").tolist()

    return [str(i + 1) for i in range(len(df))]


@router.post("/upload", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    user_email: str = Form("demo@example.com"),
    column_mapping: str | None = Form(None),
    db: Session = Depends(get_db),
):
    """Upload a CSV, store metadata, run ML stub, and persist predictions."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing filename.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    safe_name = os.path.basename(file.filename)
    stored_name = f"{uuid4().hex}_{safe_name}"
    stored_path = UPLOADS_DIR / stored_name

    try:
        content = await file.read()
        stored_path.write_bytes(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    try:
        df = pd.read_csv(stored_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {e}")

    if len(df) == 0:
        raise HTTPException(status_code=400, detail="CSV contains no rows.")

    mapping_dict = None
    if column_mapping:
        try:
            mapping_dict = json.loads(column_mapping)
            if not isinstance(mapping_dict, dict):
                raise ValueError("column_mapping must be a JSON object")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid column_mapping JSON: {e}")

    customer_ids = _extract_customer_ids(df)

    try:
        pred_df = predict_churn(df, column_mapping=mapping_dict)
    except SchemaMismatchError as e:
        raise HTTPException(status_code=400, detail=e.to_detail())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="ML model artifact not found. Train the model and ensure the artifact path is correct.",
        )

    user = crud.get_or_create_user(db, user_email)
    upload = crud.create_upload(db, user.id, safe_name)

    predictions: List[PredictionCreate] = []
    for idx, row in pred_df.iterrows():
        predictions.append(
            PredictionCreate(
                customer_id=customer_ids[idx],
                churn_probability=float(row["churn_probability"]),
                churn_label=int(row["churn_label"]),
            )
        )


    crud.create_predictions(db, upload.id, predictions)
    return UploadResponse(upload_id=upload.id)


@router.get("/results/{upload_id}", response_model=ResultsResponse)
def get_results(upload_id: int, db: Session = Depends(get_db)):
    """Return predictions for a given upload."""
    upload = crud.get_upload(db, upload_id)
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found.")

    preds = crud.get_predictions_by_upload(db, upload_id)
    return ResultsResponse(
        upload_id=upload_id,
        predictions=[PredictionRead.model_validate(p) for p in preds],
    )
