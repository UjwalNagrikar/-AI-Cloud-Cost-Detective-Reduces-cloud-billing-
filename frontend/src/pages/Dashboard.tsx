import { useEffect, useMemo, useState } from "react";
import { Play, RefreshCw, MapPin, Layers, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchResourceGroups, progressSocketUrl, runAnalysis } from "../api";
import ProgressTracker from "../components/ProgressTracker";
import type { ProgressMessage, ResourceGroup } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [selectedGroup, setSelectedGroup]   = useState("");
  const [messages, setMessages]             = useState<ProgressMessage[]>([]);
  const [error, setError]                   = useState("");
  const [loadingGroups, setLoadingGroups]   = useState(true);
  const [running, setRunning]               = useState(false);

  const selectedLocation = useMemo(
    () => resourceGroups.find((g) => g.name === selectedGroup)?.location,
    [resourceGroups, selectedGroup]
  );

  async function loadGroups() {
    setError("");
    setLoadingGroups(true);
    try {
      const groups = await fetchResourceGroups();
      setResourceGroups(groups);
      setSelectedGroup((cur) => cur || groups[0]?.name || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load resource groups.");
    } finally {
      setLoadingGroups(false);
    }
  }

  useEffect(() => { loadGroups(); }, []);

  async function analyze() {
    if (!selectedGroup) return;
    const analysisId = crypto.randomUUID();
    const socket = new WebSocket(progressSocketUrl(analysisId));
    setMessages([]);
    setError("");
    setRunning(true);

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as ProgressMessage;
      setMessages((items) => [...items, payload]);
    };
    socket.onerror = () => setError("Progress connection failed.");

    try {
      const record = await runAnalysis(selectedGroup, analysisId);
      navigate(`/report/${record.id}`, { state: { analysis: record } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      socket.close();
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="animate-fade-up">
        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-widest mb-1">
          FinOps · Azure
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
          Cost Intelligence
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Select an Azure resource group and let AI detect billing waste.
        </p>
      </div>

      {/* Main two-col grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr] animate-fade-up" style={{ animationDelay: "60ms" }}>

        {/* ── Left: Control panel ─────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 space-y-6"
          style={{
            background: "rgba(6, 15, 30, 0.7)",
            border: "1px solid rgba(0, 212, 255, 0.12)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          }}
        >
          {/* Section title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{
                  background: "rgba(0,212,255,0.08)",
                  border: "1px solid rgba(0,212,255,0.2)",
                }}
              >
                <Layers size={17} className="text-signal" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Resource Group</p>
                <p className="text-xs text-slate-600">Choose a group to scan</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadGroups}
              disabled={loadingGroups}
              title="Refresh groups"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-signal hover:bg-signal/5 transition-all duration-150 border border-transparent hover:border-signal/20"
            >
              <RefreshCw size={14} className={loadingGroups ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-widest mb-2">
              Select group
            </label>
            {loadingGroups ? (
              <div
                className="h-11 rounded-lg flex items-center px-3 gap-2"
                style={{
                  background: "rgba(2,11,24,0.8)",
                  border: "1px solid rgba(0,212,255,0.1)",
                }}
              >
                <Loader2 size={14} className="animate-spin text-signal" />
                <span className="text-sm text-slate-600">Loading groups...</span>
              </div>
            ) : (
              <select
                className="select-field"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                disabled={running}
              >
                {resourceGroups.length === 0 ? (
                  <option value="">No resource groups found</option>
                ) : (
                  resourceGroups.map((g) => (
                    <option key={g.name} value={g.name}>{g.name}</option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Location pill */}
          {selectedLocation && (
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-slate-500" />
              <span className="text-xs text-slate-500">
                Location:{" "}
                <span className="text-slate-300 font-medium">{selectedLocation}</span>
              </span>
            </div>
          )}

          {/* Info strip */}
          <div
            className="rounded-xl p-4 flex gap-3"
            style={{
              background: "rgba(0,212,255,0.03)",
              border: "1px solid rgba(0,212,255,0.08)",
            }}
          >
            <div className="shrink-0 mt-0.5">
              <ChevronRight size={14} className="text-signal" />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The scan uses <span className="text-slate-300">Azure CLI</span> to list every resource
              in the group, then sends the inventory to <span className="text-slate-300">GPT-4o</span> for
              FinOps analysis. Results include severity-ranked issues and ready-to-run fix commands.
            </p>
          </div>

          {/* Error */}
          {error && <div className="alert-error">{error}</div>}

          {/* CTA */}
          <button
            type="button"
            onClick={analyze}
            disabled={!selectedGroup || running || loadingGroups}
            className={`btn-primary w-full text-base font-bold ${!running && selectedGroup && !loadingGroups ? "btn-scan" : ""}`}
            style={{ height: "3.25rem", borderRadius: "0.75rem" }}
          >
            {running ? (
              <><Loader2 size={18} className="animate-spin" /> Scanning...</>
            ) : (
              <><Play size={18} fill="currentColor" /> Initiate Scan</>
            )}
          </button>
        </div>

        {/* ── Right: Progress tracker ─────────────────────────────── */}
        <ProgressTracker messages={messages} />
      </div>
    </div>
  );
}