/// <reference types="vite/client" />
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API_BASE}${path}`, options);
}
