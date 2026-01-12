import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

_workspace_dir = Path(__file__).resolve().parents[2]
_data_dir = Path(os.getenv("CHURN_PLATFORM_DATA_DIR", str(_workspace_dir / "data" / "churn_platform"))).resolve()
_data_dir.mkdir(parents=True, exist_ok=True)
_default_sqlite_path = (_data_dir / "churn.db").resolve()

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{_default_sqlite_path.as_posix()}")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
