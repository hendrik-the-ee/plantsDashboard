export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(path, { ...options, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

export const api = {
  listPlants(includeArchived = false) {
    const query = includeArchived ? '?includeArchived=1' : '';
    return request(`/api/plants${query}`);
  },
  getPlant(id) {
    return request(`/api/plants/${id}`);
  },
  createPlant(data) {
    return request('/api/plants', { method: 'POST', body: JSON.stringify(data) });
  },
  updatePlant(id, data) {
    return request(`/api/plants/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  archivePlant(id) {
    return request(`/api/plants/${id}`, { method: 'DELETE' });
  },
  getSettings() {
    return request('/api/settings');
  },
  updateSettings(data) {
    return request('/api/settings', { method: 'PATCH', body: JSON.stringify(data) });
  },
};
