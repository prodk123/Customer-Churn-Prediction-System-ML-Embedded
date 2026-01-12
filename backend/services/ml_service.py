from pathlib import Path
from difflib import get_close_matches

import joblib
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[2]  # churn_platform/
MODEL_PATH = BASE_DIR / "training" / "churn_prediction_system.pkl"

# Load once when this module is imported
bundle = joblib.load(MODEL_PATH)
pipeline = bundle["pipeline"]
THRESHOLD = bundle.get("threshold", 0.6)


class SchemaMismatchError(ValueError):
    def __init__(
        self,
        message: str,
        *,
        required_columns: list[str],
        detected_columns: list[str],
        missing_columns: list[str],
        suggested_mapping: dict[str, str],
    ):
        super().__init__(message)
        self.required_columns = required_columns
        self.detected_columns = detected_columns
        self.missing_columns = missing_columns
        self.suggested_mapping = suggested_mapping

    def to_detail(self) -> dict:
        return {
            "code": "SCHEMA_MISMATCH",
            "message": str(self),
            "required_columns": self.required_columns,
            "detected_columns": self.detected_columns,
            "missing_columns": self.missing_columns,
            "suggested_mapping": self.suggested_mapping,
        }


def _expected_feature_columns() -> list[str]:
    """Return the feature columns the pipeline was trained with, if available."""
    cols = getattr(pipeline, "feature_names_in_", None)
    if cols is None:
        cols = bundle.get("feature_columns")
    if cols is None:
        raise ValueError(
            "Model is missing expected feature column metadata. "
            "Re-train and save feature columns (or use sklearn's feature_names_in_)."
        )
    return [str(c) for c in list(cols)]


def get_required_columns() -> list[str]:
    return _expected_feature_columns()


def _norm_col(name: str) -> str:
    return "".join(ch for ch in str(name).strip().lower() if ch.isalnum())


def _suggest_mapping(required: list[str], detected: list[str]) -> dict[str, str]:
    detected_norm_to_raw = {_norm_col(c): c for c in detected}
    detected_norms = list(detected_norm_to_raw.keys())

    suggestions: dict[str, str] = {}
    for req in required:
        req_norm = _norm_col(req)
        if req_norm in detected_norm_to_raw:
            suggestions[req] = detected_norm_to_raw[req_norm]
            continue

        close = get_close_matches(req_norm, detected_norms, n=1, cutoff=0.75)
        if close:
            suggestions[req] = detected_norm_to_raw[close[0]]
        else:
            suggestions[req] = ""

    return suggestions


def _align_dataframe_to_model(
    df_new: pd.DataFrame, *, column_mapping: dict[str, str] | None = None
) -> tuple[pd.DataFrame, list[str], dict[str, str]]:
    """Return (aligned_df, missing_required_cols, used_mapping).

    `column_mapping` is expected to be: {required_col: uploaded_col}
    """
    required = _expected_feature_columns()
    detected = list(df_new.columns)

    used_mapping: dict[str, str] = {}
    missing: list[str] = []

    incoming = df_new.copy()
    incoming_norm_to_raw = {_norm_col(c): c for c in incoming.columns}

    aligned = pd.DataFrame(index=incoming.index)
    for req in required:
        mapped = None
        if column_mapping and req in column_mapping and column_mapping[req]:
            mapped = column_mapping[req]
            if mapped not in incoming.columns:
                mapped = None

        if mapped is None:
            # fallback: exact normalized match
            req_norm = _norm_col(req)
            mapped = incoming_norm_to_raw.get(req_norm)

        if mapped is None:
            missing.append(req)
            aligned[req] = np.nan
            used_mapping[req] = ""
        else:
            aligned[req] = incoming[mapped]
            used_mapping[req] = mapped

    return aligned, missing, used_mapping


def predict_churn(
    df_new: pd.DataFrame, *, column_mapping: dict[str, str] | None = None
) -> pd.DataFrame:
    required = _expected_feature_columns()
    detected = list(df_new.columns)
    suggested = _suggest_mapping(required, detected)

    aligned, missing, used = _align_dataframe_to_model(
        df_new, column_mapping=column_mapping
    )
    if missing and column_mapping is None:
        raise SchemaMismatchError(
            "Please map the required model columns to your uploaded CSV columns.",
            required_columns=required,
            detected_columns=detected,
            missing_columns=missing,
            suggested_mapping=suggested,
        )

    try:
        probs = pipeline.predict_proba(aligned)[:, 1]
    except Exception as e:
        raise ValueError(f"Failed to run model inference: {e}")

    labels = (probs >= float(THRESHOLD)).astype(int)

    result = df_new.copy()
    result["churn_probability"] = probs
    result["churn_label"] = labels
    return result
