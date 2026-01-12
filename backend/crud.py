from typing import Iterable, List, Optional
from sqlalchemy.orm import Session

from models import Prediction, Upload, User
from schemas import PredictionCreate


def get_or_create_user(db: Session, email: str) -> User:
    """Fetch a user by email or create one if it does not exist."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user

    user = User(email=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_upload(db: Session, user_id: int, filename: str) -> Upload:
    """Create an upload record."""
    upload = Upload(user_id=user_id, filename=filename)
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return upload


def create_predictions(
    db: Session, upload_id: int, predictions: Iterable[PredictionCreate]
) -> List[Prediction]:
    """Persist predictions for an upload."""
    rows = [
        Prediction(
            upload_id=upload_id,
            customer_id=p.customer_id,
            churn_probability=p.churn_probability,
            churn_label=p.churn_label,
        )
        for p in predictions
    ]
    db.add_all(rows)
    db.commit()
    return rows


def get_upload(db: Session, upload_id: int) -> Optional[Upload]:
    """Fetch an upload by id."""
    return db.query(Upload).filter(Upload.id == upload_id).first()


def get_predictions_by_upload(db: Session, upload_id: int) -> List[Prediction]:
    """Fetch all predictions for a given upload."""
    return (
        db.query(Prediction)
        .filter(Prediction.upload_id == upload_id)
        .order_by(Prediction.id.asc())
        .all()
    )
