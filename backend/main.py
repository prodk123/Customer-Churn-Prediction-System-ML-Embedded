import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import router
from database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Customer Churn Prediction Platform", version="1.0.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def health():
    """Health check endpoint."""
    return {"status": "ok"}
