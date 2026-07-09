import { Receipt } from "lucide-react";
import { useData } from "../hooks/useData";
import { getPayments } from "../api/services";

export function PaymentsPage() {
  const { data: payments, loading } = useData(getPayments);

  const statusColor: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400",
    pending: "bg-amber-500/10 text-amber-400",
    failed: "bg-red-500/10 text-red-400",
    refunded: "bg-blue-500/10 text-blue-400",
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Receipt size={18} className="text-zinc-400" />
        <h2 className="text-sm font-medium">Payments</h2>
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
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Method</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Reference</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {(payments ?? []).map((payment) => (
                  <tr key={payment.id} className="border-b border-zinc-800/50">
                    <td className="px-4 py-3 font-medium">{payment.school_name}</td>
                    <td className="px-4 py-3 font-mono">UGX {payment.amount_ugx.toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-400">{payment.method}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[payment.status] || ""}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs font-mono hidden md:table-cell">{payment.gateway_ref}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden lg:table-cell">{payment.created_at}</td>
                  </tr>
                ))}
                {(payments ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-600 text-sm">No payments</td>
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
