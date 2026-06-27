import type { AnalysisRecord, ResourceGroup } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: "Request failed." }));
    throw new Error(body.detail ?? "Request failed.");
  }

  return response.json();
}

export async function fetchResourceGroups() {
  const response = await request<{ resource_groups: ResourceGroup[] }>("/api/resource-groups");
  return response.resource_groups;
}

export async function runAnalysis(resourceGroup: string, analysisId: string) {
  return request<AnalysisRecord>("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ resource_group: resourceGroup, analysis_id: analysisId }),
  });
}

export async function fetchHistory() {
  const response = await request<{ analyses: AnalysisRecord[] }>("/api/analyses");
  return response.analyses;
}

export async function fetchAnalysis(id: string) {
  return request<AnalysisRecord>(`/api/analyses/${id}`);
}

export function progressSocketUrl(analysisId: string) {
  const url = new URL(API_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/ws/progress/${analysisId}`;
  return url.toString();
}