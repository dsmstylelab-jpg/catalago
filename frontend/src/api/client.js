const base = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
let accessToken = null, refreshInProgress = null;
export const setAccessToken = (token) => { accessToken = token; };

async function request(path, { method = 'GET', body, auth = false, headers = {}, retry = true } = {}) {
  const opts = { method, credentials: 'include', headers: { ...headers } };
  if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  if (auth && accessToken) opts.headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${base}${path}`, opts);
  if (response.status === 401 && auth && retry) {
    try { await refreshAccess(); return request(path, { method, body, auth, headers, retry: false }); } catch { /* cae al error de abajo */ }
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
  return data;
}

// Una sola renovación a la vez: evita que dos peticiones simultáneas rompan la rotación del refresh token.
export function refreshAccess() {
  if (!refreshInProgress)
    refreshInProgress = request('/auth/refresh', { method: 'POST' })
      .then((d) => { setAccessToken(d.accessToken); return d; })
      .finally(() => { refreshInProgress = null; });
  return refreshInProgress;
}

export const api = {
  get: (path, auth = false) => request(path, { auth }),
  post: (path, body, auth = false) => request(path, { method: 'POST', body, auth }),
  put: (path, body, auth = false) => request(path, { method: 'PUT', body, auth }),
  patch: (path, body, auth = false) => request(path, { method: 'PATCH', body, auth }),
  delete: (path, auth = false) => request(path, { method: 'DELETE', auth }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  upload: async (path, file) => {
    const send = async (retry) => {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${base}${path}`, {
        method: 'POST', credentials: 'include', body: form,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
      });
      if (res.status === 401 && retry) { await refreshAccess(); return send(false); }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error de carga');
      return data;
    };
    return send(true);
  }
};
export const money = (value) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(value) || 0);
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
