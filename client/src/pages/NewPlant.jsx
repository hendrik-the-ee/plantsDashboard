import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import PlantForm from '../components/PlantForm.jsx';

export default function NewPlant() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  async function handleSubmit(payload) {
    setError(null);
    try {
      const plant = await api.createPlant(payload);
      navigate(`/plants/${plant.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <p>
        <Link to="/">← Dashboard</Link>
      </p>
      <h1>Add plant</h1>
      <PlantForm onSubmit={handleSubmit} submitLabel="Create plant" error={error} />
    </>
  );
}
