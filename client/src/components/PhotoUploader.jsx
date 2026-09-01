import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import DiagnosisPanel from './DiagnosisPanel.jsx';

export default function PhotoUploader({ plantId, onChange }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api.listPhotos(plantId);
      setPhotos(rows);
      setSelectedId((current) => current ?? rows[0]?.id ?? null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const row = await api.uploadPhoto(plantId, file);
      setSelectedId(row.id);
      await reload();
      onChange?.();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function handleDelete(photoId) {
    if (!window.confirm('Delete this photo?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.deletePhoto(photoId);
      await reload();
      onChange?.();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const selected = photos.find((photo) => photo.id === selectedId) ?? photos[0] ?? null;

  return (
    <section className="card">
      <div className="care-log-header">
        <h2>Photos</h2>
        <label className="button">
          {busy ? 'Uploading…' : 'Upload photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleUpload} disabled={busy} />
        </label>
      </div>

      {loading && <p className="muted">Loading photos…</p>}
      {error && <p className="bad">{error.message}</p>}

      {photos.length > 0 && (
        <>
          <div className="photo-gallery">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                className={`photo-thumb ${selected?.id === photo.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(photo.id)}
              >
                <img src={`/uploads/${photo.file_path}`} alt="" />
              </button>
            ))}
          </div>

          {selected && (
            <>
              <img className="photo-preview" src={`/uploads/${selected.file_path}`} alt="Plant" />
              <div className="button-row">
                <button type="button" className="button danger" onClick={() => handleDelete(selected.id)} disabled={busy}>
                  Delete photo
                </button>
              </div>
              <DiagnosisPanel photoId={selected.id} />
            </>
          )}
        </>
      )}

      {!loading && photos.length === 0 && (
        <p className="muted">No photos yet. Upload one to run a health diagnosis.</p>
      )}
    </section>
  );
}
