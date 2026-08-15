import { useEffect, useState } from 'react';

export default function App() {
  const [health, setHealth] = useState({ state: 'loading' });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then(async (res) => {
        const body = await res.json();
        if (!cancelled) setHealth({ state: res.ok ? 'ok' : 'error', body });
      })
      .catch((err) => {
        if (!cancelled) setHealth({ state: 'error', body: { error: err.message } });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="container">
      <h1>Garden Plants Dashboard</h1>
      <p className="muted">Phase 0 scaffold. Plants arrive in Phase 1.</p>
      <section className="card">
        <h2>API health</h2>
        {health.state === 'loading' && <p className="muted">Checking…</p>}
        {health.state === 'ok' && <p className="ok">API reachable, database {health.body.database}.</p>}
        {health.state === 'error' && (
          <p className="bad">API unreachable: {health.body?.error ?? 'unknown error'}</p>
        )}
      </section>
    </main>
  );
}
