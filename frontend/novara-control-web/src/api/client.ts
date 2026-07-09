const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

let authToken: string | null = sessionStorage.getItem("novara_control_token");

export function setToken(token: string | null) {
  authToken = token;
  if (token) sessionStorage.setItem("novara_control_token", token);
  else sessionStorage.removeItem("novara_control_token");
}

export function getToken() {
  return authToken;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}
