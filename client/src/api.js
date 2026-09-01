export class ApiError extends Error {
  constructor(status, body) {
    const detail =
      body?.details &&
      Object.entries(body.details)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join('; ');
    super(detail || body?.error || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

let authTokenGetter = null;

export function setAuthTokenGetter(fn) {
  authTokenGetter = fn;
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (authTokenGetter) {
    const token = await authTokenGetter();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(path, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

export const api = {
  listPlants(includeArchived = false, q) {
    const params = new URLSearchParams();
    if (includeArchived) params.set('includeArchived', '1');
    if (q) params.set('q', q);
    const query = params.toString();
    return request(`/api/plants${query ? `?${query}` : ''}`);
  },
  getPlant(id) {
    return request(`/api/plants/${id}`);
  },
  createPlant(data) {
    return request('/api/plants', { method: 'POST', body: JSON.stringify(data) });
  },
  lookupSpecies(name) {
    return request(`/api/plants/species-lookup?q=${encodeURIComponent(name)}`);
  },
  updatePlant(id, data) {
    return request(`/api/plants/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  archivePlant(id) {
    return request(`/api/plants/${id}`, { method: 'DELETE' });
  },
  listEvents(plantId, type) {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    return request(`/api/plants/${plantId}/events${query}`);
  },
  createEvent(plantId, data) {
    return request(`/api/plants/${plantId}/events`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  waterPlant(plantId, data = {}) {
    return request(`/api/plants/${plantId}/water`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateEvent(id, data) {
    return request(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  deleteEvent(id) {
    return request(`/api/events/${id}`, { method: 'DELETE' });
  },
  getSettings() {
    return request('/api/settings');
  },
  updateSettings(data) {
    return request('/api/settings', { method: 'PATCH', body: JSON.stringify(data) });
  },
  getWeather() {
    return request('/api/weather');
  },
  listPhotos(plantId) {
    return request(`/api/plants/${plantId}/photos`);
  },
  uploadPhoto(plantId, file, takenAt) {
    const form = new FormData();
    form.append('photo', file);
    if (takenAt) form.append('taken_at', takenAt);
    return request(`/api/plants/${plantId}/photos`, { method: 'POST', body: form });
  },
  deletePhoto(photoId) {
    return request(`/api/photos/${photoId}`, { method: 'DELETE' });
  },
  analyzePhoto(photoId) {
    return request(`/api/photos/${photoId}/analyze`, { method: 'POST' });
  },
  getPhotoAnalysis(photoId) {
    return request(`/api/photos/${photoId}/analysis`);
  },
  listRecommendations(plantId) {
    const query = plantId ? `?plantId=${plantId}` : '';
    return request(`/api/recommendations${query}`);
  },
  dismissRecommendation(key, snoozeDays) {
    return request(`/api/recommendations/${encodeURIComponent(key)}/dismiss`, {
      method: 'POST',
      body: JSON.stringify(snoozeDays != null ? { snoozeDays } : {}),
    });
  },
};
