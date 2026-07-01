import { Copy, CheckCheck, ShieldAlert, TrendingDown, AlertTriangle, CircleCheck, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { fetchAnalysis } from "../api";
import type { AnalysisRecord, Issue, Severity } from "../types";

// ── Severity config ───────────────────────────────────────────────────────────
const severityConfig: Record<Severity, { label: string; badgeClass: string; borderColor: string; Icon: typeof AlertCircle }> = {
  high:   { label: "High",   badgeClass: "badge-high",   borderColor: "rgba(239,68,68,0.4)",   Icon: AlertCircle },
  medium: { label: "Medium", badgeClass: "badge-medium", borderColor: "rgba(245,158,11,0.4)",  Icon: AlertTriangle },
  low:    { label: "Low",    badgeClass: "badge-low",    borderColor: "rgba(34,197,94,0.4)",   Icon: CircleCheck },
};

// ── Copy block ────────────────────────────────────────────────────────────────
function CopyBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="cli-block mt-3">
      <div className="cli-block-header">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-danger/60" />
          <div className="h-2 w-2 rounded-full bg-warn/60" />
          <div className="h-2 w-2 rounded-full bg-good/60" />
          <span className="ml-2 text-[10px] font-mono font-medium text-slate-600 uppercase tracking-widest">
            Azure CLI · Fix Command
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium transition-all"
          style={{
            background: copied ? "rgba(34,197,94,0.1)" : "rgba(0,212,255,0.06)",
            border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "rgba(0,212,255,0.18)"}`,
            color: copied ? "#86efac" : "rgba(0,212,255,0.8)",
          }}
        >
          {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>{command}</pre>
    </div>
  );
}

// ── Issue card ────────────────────────────────────────────────────────────────
function IssueCard({ issue, index }: { issue: Issue; index: number }) {
  const { badgeClass, borderColor, Icon } = severityConfig[issue.severity];

  return (
    <article
      className="rounded-2xl p-5 animate-fade-up"
      style={{
        background: "rgba(6,15,30,0.7)",
        border: "1px solid rgba(26,53,87,0.8)",
        borderLeft: `3px solid ${borderColor}`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Icon size={18} className="mt-0.5 shrink-0 text-slate-500" />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-100 text-[15px] truncate">{issue.resource_name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{issue.issue_type}</p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider ${badgeClass}`}>
          {issue.severity}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-400">{issue.explanation}</p>

      <div
        className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          background: "rgba(34,197,94,0.05)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        <TrendingDown size={13} className="text-good shrink-0" />
        <span className="text-xs text-slate-400">Estimated savings:</span>
        <span className="text-xs font-semibold text-good">{issue.estimated_savings}</span>
      </div>

      <CopyBlock command={issue.fix_command} />
    </article>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  color = "text-white",
  glow,
}: {
  label: string;
  value: string | number;
  color?: string;
  glow?: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(13,31,54,0.6)",
        border: "1px solid rgba(26,53,87,0.9)",
        boxShadow: glow ? `inset 0 0 20px ${glow}` : undefined,
      }}
    >
      <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{label}</p>
      <p className={`stat-value mt-2 ${color}`}>{value}</p>
    </div>
  );
}

// ── Report page ───────────────────────────────────────────────────────────────
export default function Report() {
  const { id }     = useParams();
  const location   = useLocation();
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
    return <div className="alert-error">{error}</div>;
  }

  if (!analysis) {
    return (
      <div className="flex items-center gap-3 text-slate-500 text-sm">
        <div className="h-4 w-4 rounded-full border-2 border-signal border-t-transparent animate-spin" />
        Loading report...
      </div>
    );
  }

  const result      = analysis.analysis_result;
  const highCount   = result.issues.filter((i) => i.severity === "high").length;
  const medCount    = result.issues.filter((i) => i.severity === "medium").length;
  const lowCount    = result.issues.filter((i) => i.severity === "low").length;

  return (
    <div className="space-y-6">

      {/* ── Hero savings banner ────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden animate-fade-up"
        style={{
          background: "linear-gradient(135deg, rgba(6,15,30,0.95) 0%, rgba(13,31,54,0.95) 100%)",
          border: "1px solid rgba(0,212,255,0.18)",
          boxShadow: "0 0 60px rgba(0,212,255,0.06)",
        }}
      >
        {/* Subtle glow blob */}
        <div
          className="absolute -top-12 -right-12 h-48 w-48 rounded-full pointer-events-none"
          style={{ background: "rgba(0,212,255,0.06)", filter: "blur(40px)" }}
        />

        <div className="relative">
          <div className="flex items-start gap-4">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              <ShieldAlert size={20} className="text-warn" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                Analysis · {analysis.resource_group}
              </p>
              <h1 className="text-2xl font-bold font-display text-white mt-0.5 tracking-tight">
                Report Complete
              </h1>
            </div>

            {/* Big savings number */}
            <div className="ml-auto text-right shrink-0">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest">
                Est. Savings
              </p>
              <p
                className="text-3xl font-bold font-display mt-1"
                style={{
                  background: "linear-gradient(135deg, #22c55e, #86efac)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                ${analysis.estimated_savings.monthly} {analysis.estimated_savings.currency}
              </p>
              <p className="text-[10px] text-slate-600">per month</p>
            </div>
          </div>

          {/* Summary */}
          <p className="mt-4 text-sm leading-7 text-slate-400">{result.summary}</p>

          {/* Stat bar */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <StatCard label="Resources" value={analysis.resources_scanned} />
            <StatCard label="Issues"    value={analysis.issues_found} color="text-warn" glow="rgba(245,158,11,0.05)" />
            <StatCard label="Savings"   value={`$${analysis.estimated_savings.monthly}`} color="text-good" glow="rgba(34,197,94,0.05)" />
          </div>

          {/* Severity breakdown */}
          {result.issues.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {highCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold badge-high">
                  <AlertCircle size={11} /> {highCount} High
                </span>
              )}
              {medCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold badge-medium">
                  <AlertTriangle size={11} /> {medCount} Medium
                </span>
              )}
              {lowCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold badge-low">
                  <CircleCheck size={11} /> {lowCount} Low
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Issue cards ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        {result.issues.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: "rgba(34,197,94,0.04)",
              border: "1px solid rgba(34,197,94,0.12)",
            }}
          >
            <CircleCheck size={32} className="text-good mx-auto mb-3" />
            <p className="text-sm font-medium text-good">No issues detected</p>
            <p className="text-xs text-slate-600 mt-1">
              This resource group looks well-optimised.
            </p>
          </div>
        ) : (
          result.issues.map((issue, i) => (
            <IssueCard key={`${issue.resource_name}-${i}`} issue={issue} index={i} />
          ))
        )}
      </div>
    </div>
  );
}