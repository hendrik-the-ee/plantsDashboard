import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatEventTime } from '../lib/careEvents.js';

const ASK_MAX = 500;

export default function DiagnosisPanel({ photoId }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState('');

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
    setAskOpen(false);
    setQuestion('');
  }, [photoId]);

  useEffect(() => {
    if (!analysis || analysis.status === 'done' || analysis.status === 'failed' || analysis.status === 'none') {
      return undefined;
    }
    const timer = setInterval(reload, 2000);
    return () => clearInterval(timer);
  }, [analysis, reload]);

  async function runAnalyze(customQuestion) {
    setBusy(true);
    setError(null);
    try {
      await api.analyzePhoto(photoId, customQuestion);
      setAskOpen(false);
      setQuestion('');
      await reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function handleAnalyze() {
    return runAnalyze();
  }

  function handleAskSubmit(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setError(new Error('Enter a question to ask about this photo.'));
      return;
    }
    return runAnalyze(trimmed);
  }

  if (loading && !analysis) return <p className="muted">Loading analysis…</p>;

  return (
    <div className="diagnosis-panel">
      <div className="care-log-header">
        <h3>Diagnosis</h3>
        <div className="button-row">
          <button type="button" className="button" onClick={handleAnalyze} disabled={busy}>
            {busy && !askOpen ? 'Starting…' : analysis?.status === 'done' ? 'Re-analyze' : 'Analyze'}
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => setAskOpen((open) => !open)}
            disabled={busy}
          >
            Ask
          </button>
        </div>
      </div>

      {askOpen && (
        <form className="diagnosis-ask" onSubmit={handleAskSubmit}>
          <label>
            Your question
            <textarea
              rows="3"
              maxLength={ASK_MAX}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Is this overwatering or pests?"
              disabled={busy}
            />
          </label>
          <div className="diagnosis-ask-footer">
            <span className="muted">
              {question.length}/{ASK_MAX}
            </span>
            <button type="submit" className="button" disabled={busy || !question.trim()}>
              {busy ? 'Starting…' : 'Run'}
            </button>
          </div>
        </form>
      )}

      {error && <p className="bad">{error.message}</p>}

      {analysis?.status === 'none' && !askOpen && (
        <p className="muted">Click Analyze for a health check, or Ask to pose a specific question.</p>
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
