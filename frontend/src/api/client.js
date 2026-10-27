const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const isJson = res.headers
    .get('content-type')
    ?.includes('application/json');

  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(
      body?.error || `Request failed: ${res.status}`
    );
  }

  return body;
}

export const api = {
  health: () =>
    request('/health'),

  generate: (data) =>
    request('/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateBatch: (items) =>
    request('/generate/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  listJobs: (limit = 100) =>
    request(`/jobs?limit=${limit}`),

  getJob: (id) =>
    request(`/jobs/${id}`),

  regenerateJob: (id) =>
    request(`/jobs/${id}/regenerate`, {
      method: 'POST',
    }),

  downloadUrl: (id) =>
    `${BASE}/jobs/${id}/download`,

  download: (id) => {
    const a = document.createElement('a');

    a.href = `${BASE}/jobs/${id}/download`;
    a.download = `document-${id}.pdf`;

    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  listTemplates: () =>
    request('/templates'),

  createTemplate: (data) =>
    request('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteTemplate: (id) =>
    request(`/templates/${id}`, {
      method: 'DELETE',
    }),

  requestApiAccess: (data) =>
    request('/api-access/request', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  adminLogin: (password) =>
    request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  adminLogout: () =>
    request('/admin/logout', {
      method: 'POST',
    }),

  queueStats: () =>
    request('/admin/queue'),

  adminJobs: (status) =>
    request(
      `/admin/jobs${status ? `?status=${status}` : ''}`
    ),

  listApiKeys: () =>
    request('/admin/api-keys'),

  createApiKey: (owner) =>
    request('/admin/api-keys', {
      method: 'POST',
      body: JSON.stringify({ owner }),
    }),

  revokeApiKey: (id) =>
    request(`/admin/api-keys/${id}`, {
      method: 'DELETE',
    }),

  listApiAccessRequests: (status) =>
    request(
      `/admin/api-access-requests${
        status ? `?status=${status}` : ''
      }`
    ),

  approveApiAccessRequest: (id) =>
    request(
      `/admin/api-access-requests/${id}/approve`,
      {
        method: 'POST',
      }
    ),

  rejectApiAccessRequest: (id) =>
    request(
      `/admin/api-access-requests/${id}/reject`,
      {
        method: 'POST',
      }
    ),
};
