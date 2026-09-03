import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatEventTime } from '../lib/careEvents.js';

export default function DiagnosisPanel({ photoId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAnalysis(await api.getPhotoAnalysis(photoId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [photoId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!analysis || analysis.status === 'done' || analysis.status === 'failed' || analysis.status === 'none') {
      return undefined;
    }
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [analysis, reload]);

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      await api.analyzePhoto(photoId);
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !analysis) return <p className="muted">Loading analysis…</p>;

  return (
    <div className="diagnosis-panel">
      <div className="care-log-header">
        <h3>Diagnosis</h3>
        <button type="button" className="button" onClick={analyze} disabled={busy}>
          {busy ? 'Starting…' : analysis?.status === 'done' ? 'Re-analyze' : 'Analyze'}
        </button>
      </div>

      {error && <p className="bad">{error.message}</p>}

      {analysis?.status === 'none' && (
        <p className="muted">Click Analyze to get health findings from Gemini vision.</p>
      )}

      {(analysis?.status === 'queued' || analysis?.status === 'running') && (
        <p className="muted">Analysis in progress…</p>
      )}

      {analysis?.status === 'failed' && (
        <>
          {analysis.completed_at && (
            <p className="muted diagnosis-date">
              Analysis attempted {formatEventTime(analysis.completed_at)}
            </p>
          )}
          <p className="bad">{analysis.error || 'Analysis failed'}</p>
        </>
      )}

      {analysis?.status === 'done' && (
        <>
          {analysis.completed_at && (
            <p className="muted diagnosis-date">
              Photo analysis {formatEventTime(analysis.completed_at)}
            </p>
          )}
          {analysis.prompt_summary && (
            <p className="muted diagnosis-prompt">{analysis.prompt_summary}</p>
          )}
          <div className="diagnosis-summary">
            {analysis.health_score != null && (
              <p>
                <strong>Health score:</strong> {Math.round(analysis.health_score)}/100
              </p>
            )}
            {analysis.growth_stage && (
              <p>
                <strong>Growth stage:</strong> {analysis.growth_stage}
              </p>
            )}
            {analysis.estimated_harvest_on && (
              <p>
                <strong>Estimated harvest:</strong> {analysis.estimated_harvest_on}
              </p>
            )}
          </div>
          {analysis.findings?.length > 0 ? (
            <ul className="advisory-list">
              {analysis.findings.map((finding) => (
                <li key={finding.id} className={`advisory-item advisory-${finding.severity}`}>
                  <strong>{finding.issue.replace(/_/g, ' ')}</strong>
                  <span>{finding.recommendation}</span>
                  <span className="muted">
                    {finding.severity} · {Math.round(finding.confidence * 100)}% confidence
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No issues detected.</p>
          )}
        </>
      )}
    </div>
  );
}
