export type Severity = "high" | "medium" | "low";

export type Issue = {
  resource_name: string;
  issue_type: string;
  severity: Severity;
  explanation: string;
  estimated_savings: string;
  fix_command: string;
};

export type AnalysisPayload = {
  analysis_id: string;
  resource_group: string;
  resources_scanned: number;
  issues_found: number;
  summary: string;
  issues: Issue[];
  estimated_savings: string;
};

export type AnalysisRecord = {
  id: string;
  resource_group: string;
  resources_scanned: number;
  issues_found: number;
  estimated_savings: string;
  analysis_result: AnalysisPayload;
  status: string;
  created_at: string;
};

export type ResourceGroup = {
  name: string;
  location?: string | null;
};

export type ProgressMessage = {
  analysis_id: string;
  message: string;
  status: "running" | "complete" | "error";
  timestamp: string;
};
