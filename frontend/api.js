/*
 * Cliente de la API. El frontend NUNCA habla con SQL Server:
 * todo pasa por estos fetch a /api (Vite los redirige al backend en desarrollo).
 */
const TOKEN_KEY = 'ruta.token';
const USER_KEY = 'ruta.usuario';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* almacenamiento bloqueado: la sesion dura hasta recargar */ }
}

let memoryToken = read(TOKEN_KEY);
let memoryUser = (() => { try { return JSON.parse(read(USER_KEY)); } catch { return null; } })();
let onUnauthorized = () => {};

export const session = {
  get token() { return memoryToken; },
  get user() { return memoryUser; },
  save({ token, usuario }) {
    memoryToken = token;
    memoryUser = usuario;
    write(TOKEN_KEY, token);
    write(USER_KEY, JSON.stringify(usuario));
  },
  clear() {
    memoryToken = null;
    memoryUser = null;
    write(TOKEN_KEY, null);
    write(USER_KEY, null);
  },
  onUnauthorized(callback) { onUnauthorized = callback; }
};

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (memoryToken) headers.Authorization = `Bearer ${memoryToken}`;

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa que la API esté corriendo.', 0);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && memoryToken) onUnauthorized();
    throw new ApiError(data?.error || `Error ${response.status}`, response.status);
  }
  return data;
}

/** Arma ?a=1&b=2 omitiendo vacios. */
export function toQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
