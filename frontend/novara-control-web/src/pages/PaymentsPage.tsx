import { Receipt, ExternalLink } from "lucide-react";
import { useData } from "../hooks/useData";
import { getPayments } from "../api/services";

export function PaymentsPage() {
  const { data: payments, loading, refresh } = useData(getPayments);

  const statusColor: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    refunded: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  const methodLabel: Record<string, string> = {
    mobile_money: "Mobile Money",
    bank_account: "Bank Account",
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-zinc-400" />
          <h2 className="text-sm font-medium">Payments & Registrations</h2>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          Refresh
        </button>
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
                  <th className="text-left px-4 py-3 font-medium">School</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Method</th>
                  <th className="text-left px-4 py-3 font-medium">Payment Details</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((payment: any) => (
                  <tr key={payment.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-zinc-100">{payment.school_name}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{payment.plan_name || "N/A"}</td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">{methodLabel[payment.method] || payment.method}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono max-w-[200px] truncate">{payment.gateway_ref}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${statusColor[payment.status] || ""}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden md:table-cell">
                      {payment.created_at ? new Date(payment.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
                {(payments ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Receipt size={32} className="text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-600 text-sm">No registration payments yet</p>
                      <p className="text-zinc-700 text-xs mt-1">Payments will appear here when schools register</p>
                    </td>
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
