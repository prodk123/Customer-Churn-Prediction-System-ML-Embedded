import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Upload from "./Upload";
import Results from "./Results";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div className="container header-inner">
            <div className="brand">
              <div className="brand-mark" aria-hidden="true">CI</div>
              <div className="brand-text">
                <div className="brand-title">ChurnIQ</div>
                <div className="brand-subtitle">Customer Churn Prediction Platform</div>
              </div>
            </div>
            <span className="badge badge-soft">ML stub enabled</span>
          </div>
        </header>

        <main className="container app-main">
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/results/:uploadId" element={<Results />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <div className="container footer-inner">
            <span className="muted">© {new Date().getFullYear()} ChurnIQ</span>
            <span className="muted">Secure uploads • Replace ML later in backend/services/ml_stub.py</span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
