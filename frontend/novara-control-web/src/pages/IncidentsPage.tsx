import { AlertTriangle } from "lucide-react";
import { useData } from "../hooks/useData";
import { getIncidents } from "../api/services";

export function IncidentsPage() {
  const { data: incidents, loading } = useData(getIncidents);

  const severityColor: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400",
    warning: "bg-amber-500/10 text-amber-400",
    info: "bg-blue-500/10 text-blue-400",
  };

  const statusColor: Record<string, string> = {
    open: "bg-red-500/10 text-red-400",
    investigating: "bg-amber-500/10 text-amber-400",
    resolved: "bg-emerald-500/10 text-emerald-400",
    closed: "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400",
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-zinc-500 dark:text-zinc-400" />
        <h2 className="text-sm font-medium">Incidents</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-white dark:bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">School</th>
                  <th className="text-left px-4 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">Severity</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Assigned To</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {(incidents ?? []).map((inc) => (
                  <tr key={inc.id} className="border-b border-zinc-200/50 dark:border-zinc-200 dark:border-zinc-800/50">
                    <td className="px-4 py-3 font-medium">{inc.school_name}</td>
                    <td className="px-4 py-3 text-zinc-300 dark:text-zinc-700 dark:text-zinc-300">{inc.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${severityColor[inc.severity] || ""}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[inc.status] || ""}`}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">{inc.assigned_to || "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">{inc.created_at}</td>
                  </tr>
                ))}
                {(incidents ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-600 text-sm">No incidents</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
