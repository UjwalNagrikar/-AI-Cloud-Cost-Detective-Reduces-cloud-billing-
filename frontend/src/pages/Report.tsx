import { Copy, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchAnalysis } from "../api";
import type { AnalysisRecord, Issue, Severity } from "../types";

const severityClass: Record<Severity, string> = {
  high: "border-danger/40 bg-danger/10 text-red-200",
  medium: "border-warning/40 bg-warning/10 text-amber-200",
  low: "border-good/40 bg-good/10 text-emerald-200"
};

function CopyBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="mt-3 overflow-hidden rounded-md border border-line bg-ink">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="text-xs uppercase text-slate-500">Azure CLI</span>
        <button
          type="button"
          onClick={copy}
          className="grid h-8 w-8 place-items-center rounded-md text-slate-300 hover:bg-white/5"
          title="Copy command"
        >
          <Copy size={15} />
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-sm text-slate-200"><code>{command}</code></pre>
      {copied && <p className="px-3 pb-3 text-xs text-cyanline">Copied</p>}
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <article className="rounded-md border border-line bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{issue.resource_name}</h3>
          <p className="mt-1 text-sm text-slate-400">{issue.issue_type}</p>
        </div>
        <span className={`rounded-md border px-2 py-1 text-xs font-semibold capitalize ${severityClass[issue.severity]}`}>
          {issue.severity}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{issue.explanation}</p>
      <p className="mt-3 text-sm text-slate-400">Estimated savings: <span className="text-slate-100">{issue.estimated_savings}</span></p>
      <CopyBlock command={issue.fix_command} />
    </article>
  );
}

export default function Report() {
  const { id } = useParams();
  const location = useLocation();
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(
    (location.state as { analysis?: AnalysisRecord } | null)?.analysis ?? null
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || analysis) return;
    fetchAnalysis(id)
      .then(setAnalysis)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load report."));
  }, [id, analysis]);

  if (error) {
    return <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200">{error}</p>;
  }

  if (!analysis) {
    return <p className="text-sm text-slate-400">Loading report...</p>;
  }

  const result = analysis.analysis_result;

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-panel p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-warning/10 text-warning">
            <ShieldAlert size={20} />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-white">Analysis Report</h1>
            <p className="mt-1 text-sm text-slate-400">{analysis.resource_group}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-ink p-4">
            <p className="text-sm text-slate-400">Resources scanned</p>
            <p className="mt-2 text-2xl font-semibold text-white">{analysis.resources_scanned}</p>
          </div>
          <div className="rounded-md border border-line bg-ink p-4">
            <p className="text-sm text-slate-400">Issues found</p>
            <p className="mt-2 text-2xl font-semibold text-white">{analysis.issues_found}</p>
          </div>
          <div className="rounded-md border border-line bg-ink p-4">
            <p className="text-sm text-slate-400">Estimated savings</p>
            <p className="mt-2 text-2xl font-semibold text-white">{analysis.estimated_savings}</p>
          </div>
        </div>

        <p className="mt-5 leading-7 text-slate-300">{result.summary}</p>
      </section>

      <section className="space-y-4">
        {result.issues.length === 0 ? (
          <div className="rounded-md border border-line bg-panel p-5 text-sm text-slate-300">No issues returned by the analysis.</div>
        ) : (
          result.issues.map((issue, index) => <IssueCard key={`${issue.resource_name}-${index}`} issue={issue} />)
        )}
      </section>
    </div>
  );
}
