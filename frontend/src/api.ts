import type { AnalysisRecord, ResourceGroup } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const tokenStore = {
  get: () => localStorage.getItem("token"),
  set: (token: string) => localStorage.setItem("token", token),
  clear: () => localStorage.removeItem("token")
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed." }));
    throw new Error(body.detail ?? "Request failed.");
  }

  return response.json();
}

export async function signup(email: string, password: string) {
  return request<{ token: string; user: { id: number; email: string } }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: { id: number; email: string } }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function fetchResourceGroups() {
  const response = await request<{ resource_groups: ResourceGroup[] }>("/api/resource-groups");
  return response.resource_groups;
}

export async function runAnalysis(resourceGroup: string, analysisId: string) {
  return request<AnalysisRecord>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ resource_group: resourceGroup, analysis_id: analysisId })
  });
}

export async function fetchHistory() {
  const response = await request<{ analyses: AnalysisRecord[] }>("/api/history");
  return response.analyses;
}

export async function fetchAnalysis(id: string) {
  return request<AnalysisRecord>(`/api/history/${id}`);
}

export function progressSocketUrl(analysisId: string) {
  const token = tokenStore.get() ?? "";
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/ws/progress/${analysisId}`;
  url.searchParams.set("token", token);
  return url.toString();
}
