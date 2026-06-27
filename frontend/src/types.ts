export type Severity = "high" | "medium" | "low";

export type Issue = {
  resource_name: string;
  resource_type: string;
  resource_group: string;
  issue: string;
  suggestion: string;
  severity: Severity;
  estimated_monthly_savings: string;
  fix_command: string;
};

export type EstimatedSavings = {
  monthly: number;
  yearly: number;
  currency: string;
};

export type AnalysisPayload = {
  analysis_id: string;
  resource_group: string;
  resources_scanned: number;
  issues_found: number;
  issues: Issue[];
  estimated_savings: EstimatedSavings;
};

export type AnalysisRecord = {
  id: string;
  resource_group: string;
  resources_scanned: number;
  issues_found: number;
  estimated_savings: EstimatedSavings;
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