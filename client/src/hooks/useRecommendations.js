import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export function useRecommendations(plantId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await api.listRecommendations(plantId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [plantId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function dismiss(key, snoozeDays) {
    await api.dismissRecommendation(key, snoozeDays);
    await reload();
  }

  return { items, loading, error, reload, dismiss };
}
