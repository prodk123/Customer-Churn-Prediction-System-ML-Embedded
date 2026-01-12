from datetime import datetime
from typing import List
from pydantic import BaseModel, ConfigDict, Field


class UploadResponse(BaseModel):
    upload_id: int


class PredictionCreate(BaseModel):
    customer_id: str
    churn_probability: float = Field(ge=0.0, le=1.0)
    churn_label: int = Field(ge=0, le=1)


class PredictionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    upload_id: int
    customer_id: str
    churn_probability: float
    churn_label: int
    created_at: datetime


class ResultsResponse(BaseModel):
    upload_id: int
    predictions: List[PredictionRead]
