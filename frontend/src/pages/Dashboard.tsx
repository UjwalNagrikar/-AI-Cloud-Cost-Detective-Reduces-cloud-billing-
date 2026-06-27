import { useEffect, useMemo, useState } from "react";
import { Play, RefreshCw, ServerCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchResourceGroups, progressSocketUrl, runAnalysis } from "../api";
import ProgressTracker from "../components/ProgressTracker";
import type { ProgressMessage, ResourceGroup } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [messages, setMessages] = useState<ProgressMessage[]>([]);
  const [error, setError] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [running, setRunning] = useState(false);

  const selectedLocation = useMemo(
    () => resourceGroups.find((group) => group.name === selectedGroup)?.location,
    [resourceGroups, selectedGroup]
  );

  async function loadGroups() {
    setError("");
    setLoadingGroups(true);
    try {
      const groups = await fetchResourceGroups();
      setResourceGroups(groups);
      setSelectedGroup((current) => current || groups[0]?.name || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load resource groups.");
    } finally {
      setLoadingGroups(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

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

    socket.onerror = () => {
      setError("Progress connection failed.");
    };

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
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-md border border-line bg-panel p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-cyanline/10 text-cyanline">
              <ServerCog size={20} />
            </span>
            <div>
              <h1 className="text-xl font-semibold text-white">Dashboard</h1>
              <p className="text-sm text-slate-400">Select an Azure resource group</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadGroups}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-300 hover:bg-white/5"
            title="Refresh resource groups"
          >
            <RefreshCw size={17} className={loadingGroups ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="block text-sm text-slate-300">
            Resource group
            <select
              className="mt-2 h-11 w-full rounded-md border border-line bg-ink px-3 text-white outline-none focus:border-cyanline"
              value={selectedGroup}
              onChange={(event) => setSelectedGroup(event.target.value)}
              disabled={loadingGroups || running}
            >
              {resourceGroups.map((group) => (
                <option key={group.name} value={group.name}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={analyze}
            disabled={!selectedGroup || running}
            className="mt-7 flex h-11 items-center justify-center gap-2 rounded-md bg-cyanline px-5 font-semibold text-ink hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play size={17} />
            {running ? "Running" : "Run Analysis"}
          </button>
        </div>

        {selectedLocation && (
          <p className="mt-3 text-sm text-slate-400">Location: <span className="text-slate-200">{selectedLocation}</span></p>
        )}
        {error && <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200">{error}</p>}
      </section>

      <ProgressTracker messages={messages} />
    </div>
  );
}