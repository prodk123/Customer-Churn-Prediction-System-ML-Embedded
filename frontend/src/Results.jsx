import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchResults } from "./api";

export default function Results() {
  const { uploadId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchResults(uploadId);
        if (!mounted) return;
        setPredictions(data.predictions || []);
      } catch (err) {
        const msg =
          err?.response?.data?.detail ||
          err?.message ||
          "Failed to load results.";
        if (mounted) setError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [uploadId]);

  const rows = useMemo(() => predictions, [predictions]);
  const stats = useMemo(() => {
    const total = rows.length;
    const high = rows.filter((p) => p.churn_label === 1 || p.churn_probability > 0.6).length;
    const low = total - high;
    const avg = total ? rows.reduce((acc, p) => acc + Number(p.churn_probability || 0), 0) / total : 0;
    return { total, high, low, avg };
  }, [rows]);

  function riskFor(p) {
    const prob = Number(p.churn_probability);
    if (p.churn_label === 1 || prob > 0.6) return "high";
    if (prob >= 0.4) return "medium";
    return "low";
  }

  return (
    <div className="stack-lg">
      <div className="page-head">
        <div className="stack-xs">
          <div className="page-title">Results</div>
          <div className="muted">Upload #{uploadId}</div>
        </div>
        <div className="page-actions">
          <Link to="/" className="btn btn-secondary">
            ← Upload another
          </Link>
        </div>
      </div>

      {loading && (
        <div className="grid-3">
          <div className="card"><div className="card-body"><div className="skeleton kpi" /></div></div>
          <div className="card"><div className="card-body"><div className="skeleton kpi" /></div></div>
          <div className="card"><div className="card-body"><div className="skeleton kpi" /></div></div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="grid-3">
            <div className="card">
              <div className="card-body">
                <div className="kpi-label">Customers</div>
                <div className="kpi-value">{stats.total}</div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="kpi-label">High risk</div>
                <div className="kpi-value" style={{ color: "var(--danger)" }}>
                  {stats.high}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="kpi-label">Avg probability</div>
                <div className="kpi-value">{Math.round(stats.avg * 100)}%</div>
              </div>
            </div>
          </div>

          <section className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Predictions</div>
                <div className="card-subtitle">Sorted by upload insertion order.</div>
              </div>
              <span className="badge badge-soft">{stats.high} flagged</span>
            </div>
            <div className="card-body">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th style={{ width: 260 }}>Probability</th>
                      <th style={{ width: 160 }}>Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const risk = riskFor(p);
                      const prob = Number(p.churn_probability);
                      const percent = Math.max(0, Math.min(100, Math.round(prob * 100)));

                      return (
                        <tr key={p.id} className={risk === "high" ? "row-high" : risk === "medium" ? "row-medium" : "row-low"}>
                          <td>
                            <div className="cell-title">{p.customer_id}</div>
                            <div className="muted small">Label: {p.churn_label}</div>
                          </td>
                          <td>
                            <div className="prob">
                              <div className="prob-bar">
                                <div
                                  className={`prob-fill prob-${risk}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="prob-meta">
                                <span className="mono">{prob.toFixed(3)}</span>
                                <span className="muted">{percent}%</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`pill pill-${risk}`}>{risk.toUpperCase()}</span>
                          </td>
                        </tr>
                      );
                    })}

                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={3} className="muted" style={{ padding: 16 }}>
                          No predictions found for this upload.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
