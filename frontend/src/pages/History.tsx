import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchHistory } from "../api";
import type { AnalysisRecord } from "../types";

export default function History() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory()
      .then(setAnalyses)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-md border border-line bg-panel p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-good/10 text-good">
          <CalendarClock size={20} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-white">History</h1>
          <p className="text-sm text-slate-400">Past cost analyses</p>
        </div>
      </div>

      {error && <p className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200">{error}</p>}

      <div className="mt-5 overflow-hidden rounded-md border border-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-ink text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Resource group</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Issues</th>
              <th className="px-4 py-3 font-medium">Savings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-slate-400" colSpan={4}>Loading history...</td>
              </tr>
            ) : analyses.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-slate-400" colSpan={4}>No analyses yet.</td>
              </tr>
            ) : (
              analyses.map((analysis) => (
                <tr
                  key={analysis.id}
                  className="cursor-pointer bg-panel hover:bg-white/5"
                  onClick={() => navigate(`/report/${analysis.id}`, { state: { analysis } })}
                >
                  <td className="px-4 py-4 font-medium text-white">{analysis.resource_group}</td>
                  <td className="px-4 py-4 text-slate-300">{new Date(analysis.created_at).toLocaleString()}</td>
                  <td className="px-4 py-4 text-slate-300">{analysis.issues_found}</td>
                  <td className="px-4 py-4 text-slate-300">{analysis.estimated_savings}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
