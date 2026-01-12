# Customer Churn Prediction Platform

## Overview
A SaaS-style web application where users upload customer CSV data, the backend stores the upload + metadata, calls an ML stub (replaceable later), stores predictions, and the frontend displays results.

## Backend (FastAPI + SQLAlchemy + SQLite)

### Setup
From the project root:
```bash
python -m venv .venv
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

### Run
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Configuration
- `DATABASE_URL` (optional)
  - Default: `sqlite:///./churn.db`
  - Example (PostgreSQL): `postgresql+psycopg2://user:pass@localhost:5432/churn`
- `FRONTEND_ORIGIN` (optional)
  - Default: `http://localhost:5173`

### API Endpoints
- `POST /upload`
  - Multipart form fields:
    - `file`: CSV file
    - `user_email`: string (optional, default `demo@example.com`)
  - Response:
    - `{ "upload_id": <int> }`

- `GET /results/{upload_id}`
  - Response:
    - `{ "upload_id": <int>, "predictions": [ ... ] }`

## Frontend (React + Axios)

### Setup (Vite recommended)
Inside `frontend/`, initialize a React app (if you don't already have one):
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
```

Then replace the generated files with the provided contents:
- `src/App.jsx`
- `src/Upload.jsx`
- `src/Results.jsx`
- `src/api.js`

### Run
```bash
npm run dev
```

### Configure API Base URL (optional)
Create a `.env` in `frontend/`:
```bash
VITE_API_BASE_URL=http://localhost:8000
```

## ML Integration (later)
Replace the stub implementation in:
- `backend/services/ml_services.py`

The backend routes call `predict_from_dataframe(df)` from that file, so you can swap in a real pipeline without changing API routes.
