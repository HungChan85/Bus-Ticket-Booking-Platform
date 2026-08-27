const rawBase = (import.meta.env?.VITE_API_URL || 'http://127.0.0.1:9000').trim();
export const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export function apiUrl(path = '') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}
