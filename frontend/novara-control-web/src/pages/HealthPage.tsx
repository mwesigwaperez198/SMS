import { Activity, RotateCcw } from "lucide-react";
import { useData } from "../hooks/useData";
import { getHealth } from "../api/services";

export function HealthPage() {
  const { data: checks, loading, refresh } = useData(getHealth);

  const statusIcon = (status: string) => {
    switch (status) {
      case "ok": return "bg-emerald-500";
      case "degraded": return "bg-amber-500";
      default: return "bg-red-500";
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-zinc-500 dark:text-zinc-400" />
          <h2 className="text-sm font-medium">System Health</h2>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5"
        >
          <RotateCcw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-white dark:bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Service</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Latency</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Last Check</th>
              </tr>
            </thead>
            <tbody>
              {(checks ?? []).map((check) => (
                <tr key={check.service_name} className="border-b border-zinc-200/50 dark:border-zinc-200 dark:border-zinc-800/50">
                  <td className="px-4 py-3 font-medium">{check.service_name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusIcon(check.status)}`} />
                      <span className={
                        check.status === "ok" ? "text-emerald-400" :
                        check.status === "degraded" ? "text-amber-400" : "text-red-400"
                      }>{check.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{check.latency_ms}ms</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell">{check.checked_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
