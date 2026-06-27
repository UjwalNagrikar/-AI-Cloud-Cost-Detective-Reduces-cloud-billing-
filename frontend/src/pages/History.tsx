import { CalendarClock, ChevronRight, TrendingDown, Loader2, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchHistory } from "../api";
import type { AnalysisRecord } from "../types";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

export default function History() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchHistory()
      .then(setAnalyses)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="animate-fade-up">
        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest mb-1">
          Analysis · History
        </p>
        <h1
          className="text-3xl font-bold font-display tracking-tight"
          style={{
            background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Past Scans
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          All previous cost analyses — click any row to view the full report.
        </p>
      </div>

      {/* Body */}
      <div
        className="rounded-2xl overflow-hidden animate-fade-up"
        style={{
          background: "rgba(6,15,30,0.7)",
          border: "1px solid rgba(0,212,255,0.1)",
          animationDelay: "60ms",
        }}
      >
        {/* Table header */}
        <div
          className="grid gap-3 px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-slate-600"
          style={{
            gridTemplateColumns: "1fr 1fr auto auto auto",
            borderBottom: "1px solid rgba(26,53,87,0.8)",
            background: "rgba(2,11,24,0.4)",
          }}
        >
          <span>Resource Group</span>
          <span>Date</span>
          <span className="text-center">Resources</span>
          <span className="text-center">Issues</span>
          <span>Savings</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-600">
            <Loader2 size={18} className="animate-spin text-signal" />
            <span className="text-sm">Loading history...</span>
          </div>
        ) : error ? (
          <div className="p-5">
            <div className="alert-error">{error}</div>
          </div>
        ) : analyses.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(0,212,255,0.05)",
                border: "1px solid rgba(0,212,255,0.12)",
              }}
            >
              <CalendarClock size={28} className="text-slate-600" />
            </div>
            <div>
              <p className="text-slate-300 font-semibold">No analyses yet</p>
              <p className="text-slate-600 text-sm mt-1">
                Run your first scan from the Dashboard to see results here.
              </p>
            </div>
          </div>
        ) : (
          <ul>
            {analyses.map((analysis, i) => {
              const { date, time } = formatDate(analysis.created_at);
              return (
                <li
                  key={analysis.id}
                  onClick={() =>
                    navigate(`/report/${analysis.id}`, { state: { analysis } })
                  }
                  className="tr-hover grid gap-3 px-5 py-4 items-center animate-fade-up"
                  style={{
                    gridTemplateColumns: "1fr 1fr auto auto auto",
                    borderTop: i > 0 ? "1px solid rgba(26,53,87,0.5)" : undefined,
                    animationDelay: `${i * 50}ms`,
                  }}
                >
                  {/* Resource group name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(0,212,255,0.06)",
                        border: "1px solid rgba(0,212,255,0.14)",
                      }}
                    >
                      <CalendarClock size={13} className="text-signal" />
                    </div>
                    <span className="font-medium text-slate-200 text-sm truncate">
                      {analysis.resource_group}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    <Clock size={11} />
                    <span>{date}</span>
                    <span className="text-slate-700">·</span>
                    <span>{time}</span>
                  </div>

                  {/* Resources */}
                  <div className="text-center">
                    <span className="text-sm font-semibold text-slate-300">
                      {analysis.resources_scanned}
                    </span>
                  </div>

                  {/* Issues */}
                  <div className="text-center">
                    <span
                      className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-md text-xs font-bold"
                      style={
                        analysis.issues_found > 0
                          ? {
                              background: "rgba(245,158,11,0.12)",
                              border: "1px solid rgba(245,158,11,0.25)",
                              color: "#fcd34d",
                            }
                          : {
                              background: "rgba(34,197,94,0.08)",
                              border: "1px solid rgba(34,197,94,0.2)",
                              color: "#86efac",
                            }
                      }
                    >
                      {analysis.issues_found}
                    </span>
                  </div>

                  {/* Savings + arrow */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <TrendingDown size={12} className="text-good" />
                      <span className="text-sm font-semibold text-good">
                        {analysis.estimated_savings}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-slate-700 ml-1" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}