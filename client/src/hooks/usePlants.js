import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export function usePlants(includeArchived = false) {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlants(await api.listPlants(includeArchived));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [includeArchived]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { plants, loading, error, reload };
}
