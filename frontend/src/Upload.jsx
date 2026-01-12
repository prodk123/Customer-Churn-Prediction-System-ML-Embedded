import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadCsv } from "./api";

export default function Upload() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@example.com");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [schemaMismatch, setSchemaMismatch] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});

  async function submitUpload(e, mapping) {
    e.preventDefault();
    setError("");
    setSchemaMismatch(null);

    if (!file) {
      setError("Please select a CSV file.");
      return;
    }

    setLoading(true);
    try {
      const data = await uploadCsv({ file, email, columnMapping: mapping });
      navigate(`/results/${data.upload_id}`);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (detail && typeof detail === "object" && detail.code === "SCHEMA_MISMATCH") {
        setSchemaMismatch(detail);
        setColumnMapping(detail.suggested_mapping || {});
        setError("");
      } else {
        const msg = detail || err?.message || "Upload failed. Please try again.";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e) {
    return submitUpload(e, null);
  }

  async function onSubmitMapping(e) {
    return submitUpload(e, columnMapping);
  }

  function onPickFile(e) {
    const picked = e.target.files?.[0] || null;
    setFile(picked);
    setSchemaMismatch(null);
    setColumnMapping({});
    setError("");
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const dropped = e.dataTransfer?.files?.[0] || null;
    if (!dropped) return;

    const isCsv = dropped.name?.toLowerCase().endsWith(".csv");
    if (!isCsv) {
      setError("Only .csv files are supported.");
      return;
    }

    setError("");
    setFile(dropped);
    setSchemaMismatch(null);
    setColumnMapping({});
  }

  return (
    <div className="stack-lg">
      <div className="hero">
        <h1 className="hero-title">Predict churn in minutes</h1>
        <p className="hero-subtitle">
          Upload a customer CSV, we’ll generate churn probabilities and highlight accounts that need attention.
        </p>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Upload dataset</div>
              <div className="card-subtitle">CSV only. We store upload metadata + predictions.</div>
            </div>
            <span className="badge">Step 1</span>
          </div>

          <div className="card-body stack-md">
            <form onSubmit={onSubmit} className="stack-md">
              <div className="field">
                <label className="label">Email</label>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>

              <div className="field">
                <label className="label">CSV file</label>
                <div
                  className={`dropzone ${dragActive ? "dropzone-active" : ""}`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragActive(false);
                  }}
                  onDrop={onDrop}
                >
                  <div className="dropzone-inner">
                    <div className="dropzone-title">Drag & drop your CSV here</div>
                    <div className="dropzone-subtitle">or click to browse</div>
                    <div className="dropzone-actions">
                      <label className="btn btn-secondary" style={{ cursor: loading ? "not-allowed" : "pointer" }}>
                        Choose file
                        <input
                          disabled={loading}
                          type="file"
                          accept=".csv,text/csv"
                          onChange={onPickFile}
                          style={{ display: "none" }}
                        />
                      </label>
                      {file ? (
                        <span className="file-pill" title={file.name}>
                          <span className="file-pill-name">{file.name}</span>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => setFile(null)}
                            aria-label="Remove selected file"
                          >
                            ×
                          </button>
                        </span>
                      ) : (
                        <span className="muted">No file selected</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              {schemaMismatch && (
                <div className="alert">
                  <div className="stack-md">
                    <div>
                      <div className="small muted">Action required</div>
                      <div style={{ fontWeight: 700 }}>Map your CSV columns to the model’s required columns</div>
                      <div className="muted small">Then resubmit to run predictions.</div>
                    </div>

                    <div className="card" style={{ padding: 0 }}>
                      <div className="card-body">
                        <div className="stack-md">
                          <div className="row" style={{ justifyContent: "space-between" }}>
                            <div className="muted small">Required columns: {schemaMismatch.required_columns?.length || 0}</div>
                            <div className="muted small">Detected columns: {schemaMismatch.detected_columns?.length || 0}</div>
                          </div>

                          <div style={{ overflowX: "auto" }}>
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Required (model)</th>
                                  <th>Map to (your CSV)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(schemaMismatch.required_columns || []).map((req) => (
                                  <tr key={req}>
                                    <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                                      {req}
                                    </td>
                                    <td>
                                      <select
                                        className="input"
                                        value={columnMapping?.[req] ?? ""}
                                        onChange={(e) =>
                                          setColumnMapping((prev) => ({
                                            ...prev,
                                            [req]: e.target.value,
                                          }))
                                        }
                                      >
                                        <option value="">(not provided)</option>
                                        {(schemaMismatch.detected_columns || []).map((col) => (
                                          <option key={col} value={col}>
                                            {col}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="row">
                            <button type="button" disabled={loading} className="btn btn-secondary" onClick={() => {
                              setSchemaMismatch(null);
                              setColumnMapping({});
                            }}>
                              Cancel
                            </button>
                            <button type="button" disabled={loading} className="btn btn-primary" onClick={onSubmitMapping}>
                              {loading ? "Submitting…" : "Submit mapping & Predict"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="row">
                <button type="submit" disabled={loading} className="btn btn-primary btn-lg">
                  {loading ? (
                    <span className="btn-spinner" aria-label="Loading" />
                  ) : (
                    <span className="btn-icon" aria-hidden="true">↗</span>
                  )}
                  <span>{loading ? "Uploading…" : "Upload & Predict"}</span>
                </button>
                <div className="muted small">
                  Tip: include a `customer_id` column to display your own identifiers.
                </div>
              </div>
            </form>
          </div>
        </section>

        <aside className="card card-accent">
          <div className="card-header">
            <div>
              <div className="card-title">What you’ll get</div>
              <div className="card-subtitle">Fast, readable output for sales + retention teams.</div>
            </div>
            <span className="badge badge-soft">Step 2</span>
          </div>
          <div className="card-body stack-md">
            <div className="feature">
              <div className="feature-icon" aria-hidden="true">▦</div>
              <div>
                <div className="feature-title">Dashboard-ready table</div>
                <div className="muted">Customer ID, probability, and churn label.</div>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon" aria-hidden="true">⚡</div>
              <div>
                <div className="feature-title">Risk highlighting</div>
                <div className="muted">High risk accounts are clearly marked.</div>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon" aria-hidden="true">◎</div>
              <div>
                <div className="feature-title">ML swap-in later</div>
                <div className="muted">Model logic stays isolated in the backend service.</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
