import { ScrollText } from "lucide-react";
import { useData } from "../hooks/useData";
import { getAuditLogs } from "../api/services";

export function AuditPage() {
  const { data: logs, loading } = useData(() => getAuditLogs({ limit: 100 }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText size={18} className="text-zinc-400" />
        <h2 className="text-sm font-medium">Audit Trail</h2>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-zinc-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">Admin</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Target</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).map((log) => (
                  <tr key={log.id} className="border-b border-zinc-800/50">
                    <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">{log.created_at}</td>
                    <td className="px-4 py-3 text-zinc-300">{log.admin_name}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{log.action}</code>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs hidden md:table-cell">
                      {log.target_type} {log.target_id ? `#${log.target_id}` : ""}
                      {log.school_name && <span className="text-zinc-600"> &middot; {log.school_name}</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono hidden lg:table-cell">{log.ip_address}</td>
                  </tr>
                ))}
                {(logs ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-600 text-sm">No audit logs</td>
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
