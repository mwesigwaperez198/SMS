import { useState } from "react";
import { CreditCard, Plus, Check } from "lucide-react";
import { useData } from "../hooks/useData";
import { getPlans, createPlan, updatePlan } from "../api/services";
import type { SubscriptionPlan } from "../api/types";

export function PlansPage() {
  const { data: plans, loading, error, refresh } = useData(getPlans);
  const [editing, setEditing] = useState<Partial<SubscriptionPlan> | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await updatePlan(editing.id, editing);
      } else {
        await createPlan(editing);
      }
      setEditing(null);
      refresh();
    } catch {} finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-zinc-400" />
          <h2 className="text-sm font-medium">Subscription Plans</h2>
        </div>
        <button
          onClick={() => setEditing({ name: "", price_ugx: 0, rate_limit: 100, is_active: true, features: {} })}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg px-3 py-2 transition-colors"
        >
          <Plus size={14} /> Add Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(plans ?? []).map((plan) => (
          <div key={plan.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{plan.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${plan.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                {plan.is_active ? "Active" : "Disabled"}
              </span>
            </div>
            <div className="text-2xl font-semibold">
              UGX {plan.price_ugx.toLocaleString()}
              <span className="text-xs text-zinc-500 font-normal">/mo</span>
            </div>
            <div className="space-y-1 text-sm text-zinc-400">
              <p>{plan.max_students ?? "∞"} students</p>
              <p>{plan.max_schools ?? "∞"} schools</p>
              <p>{plan.rate_limit} req/min rate limit</p>
            </div>
            <button
              onClick={() => setEditing(plan)}
              className="w-full text-sm text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg px-3 py-2 transition-colors"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-medium">{editing.id ? "Edit Plan" : "New Plan"}</h3>
            <Field label="Name" value={editing.name || ""} onChange={(v) => setEditing({ ...editing, name: v })} />
            <Field label="Price (UGX)" type="number" value={String(editing.price_ugx || 0)} onChange={(v) => setEditing({ ...editing, price_ugx: Number(v) })} />
            <Field label="Max Students" type="number" value={String(editing.max_students ?? "")} onChange={(v) => setEditing({ ...editing, max_students: v ? Number(v) : null })} />
            <Field label="Max Schools" type="number" value={String(editing.max_schools ?? "")} onChange={(v) => setEditing({ ...editing, max_schools: v ? Number(v) : null })} />
            <Field label="Rate Limit (req/min)" type="number" value={String(editing.rate_limit || 100)} onChange={(v) => setEditing({ ...editing, rate_limit: Number(v) })} />
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="rounded bg-zinc-800 border-zinc-700 text-indigo-500" />
              <span className="text-sm text-zinc-300">Active</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(null)} className="text-sm text-zinc-400 hover:text-zinc-200 px-3 py-1.5">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-4 py-2">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500" />
    </div>
  );
}
