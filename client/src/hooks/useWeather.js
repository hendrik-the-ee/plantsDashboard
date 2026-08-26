import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api.js';

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationMissing, setLocationMissing] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLocationMissing(false);
    try {
      setWeather(await api.getWeather());
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setLocationMissing(true);
        setWeather(null);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { weather, loading, error, locationMissing, reload };
}
