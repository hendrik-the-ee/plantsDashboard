import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import PlantForm from '../components/PlantForm.jsx';

export default function EditPlant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plant, setPlant] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getPlant(id)
      .then((row) => {
        if (!cancelled) setPlant(row);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(payload) {
    setError(null);
    try {
      await api.updatePlant(id, payload);
      navigate(`/plants/${id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loadError) return <p className="bad">{loadError.message}</p>;
  if (!plant) return <p className="muted">Loading…</p>;

  return (
    <>
      <p>
        <Link to={`/plants/${id}`}>← {plant.name}</Link>
      </p>
      <h1>Edit {plant.name}</h1>
      <PlantForm plant={plant} onSubmit={handleSubmit} submitLabel="Save changes" error={error} />
    </>
  );
}
