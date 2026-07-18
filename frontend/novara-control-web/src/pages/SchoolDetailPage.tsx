import { ArrowLeft, Key, Users, AlertTriangle, Clock, Activity } from "lucide-react";
import { useData } from "../hooks/useData";
import { getSchool, getSchoolApiKeys, generateApiKey, revokeApiKey, suspendSchool, activateSchool } from "../api/services";
import { apiRequest } from "../api/client";
import { useState } from "react";
import type { ApiKey } from "../api/types";

interface SchoolDetailPageProps {
  schoolId: number;
  onBack: () => void;
}

export function SchoolDetailPage({ schoolId, onBack }: SchoolDetailPageProps) {
  const { data: school, loading, error, refresh } = useData(() => getSchool(schoolId), [schoolId]);
  const { data: apiKeys, refresh: refreshKeys } = useData(() => getSchoolApiKeys(schoolId), [schoolId]);
  const [generating, setGenerating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [diagResult, setDiagResult] = useState<string>("");

  const runDiagnostic = async (type: string) => {
    setDiagResult("Running...");
    const start = Date.now();
    try {
      if (type === "db") {
        await apiRequest("/api/health");
        setDiagResult(`DB Connection: OK (${Date.now() - start}ms)`);
      } else if (type === "api") {
        await apiRequest("/novara/dashboard/stats");
        setDiagResult(`API Ping: OK (${Date.now() - start}ms)`);
      } else if (type === "cache") {
        setDiagResult("Cache: OK (no external cache configured)");
      } else if (type === "keys") {
        const keys = await apiRequest<any[]>(`/novara/schools/${schoolId}/api-keys`);
        setDiagResult(`API Keys: ${(keys || []).length} active`);
      }
    } catch (err: any) {
      setDiagResult(`Failed: ${err.message || err}`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-white dark:bg-zinc-900 rounded-lg animate-pulse" />
        <div className="h-32 bg-white dark:bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">{error}</div>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-400",
    suspended: "bg-red-500/10 text-red-400",
    expired: "bg-amber-500/10 text-amber-400",
  };

  const handleGenerateKey = async () => {
    setGenerating(true);
    setNewKey(null);
    try {
      const result = await generateApiKey(schoolId);
      setNewKey(result.key);
      refreshKeys();
    } catch {} finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: number) => {
    if (!confirm("Revoke this API key? This will immediately block requests using it.")) return;
    try {
      await revokeApiKey(keyId);
      refreshKeys();
    } catch {}
  };

  const handleToggleStatus = async () => {
    try {
      if (school.status === "active") {
        await suspendSchool(schoolId);
      } else {
        await activateSchool(schoolId);
      }
      refresh();
    } catch {}
  };

  return (
    <div className="p-6 space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200">
        <ArrowLeft size={16} /> Back to Schools
      </button>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-medium">{school.name}</h2>
            <p className="text-xs text-zinc-500 mt-1">{school.email} &middot; {school.phone}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[school.status] || ""}`}>
            {school.status}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-sm">
          <div><span className="text-zinc-500 text-xs block">Tenant ID</span><span className="font-mono text-xs">{school.tenant_id}</span></div>
          <div><span className="text-zinc-500 text-xs block">Plan</span><span>{school.plan_name}</span></div>
          <div><span className="text-zinc-500 text-xs block">Users</span><span>{school.total_users}</span></div>
          <div><span className="text-zinc-500 text-xs block">Students</span><span>{school.total_students}</span></div>
          <div><span className="text-zinc-500 text-xs block">API Keys</span><span>{school.api_keys_count}</span></div>
          <div><span className="text-zinc-500 text-xs block">Subscription</span><span>{school.subscription_expires}</span></div>
          <div><span className="text-zinc-500 text-xs block">Last Active</span><span className="text-xs">{school.last_active}</span></div>
          <div><span className="text-zinc-500 text-xs block">Timezone</span><span className="text-xs">{school.timezone}</span></div>
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={handleToggleStatus}
            className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-colors ${
              school.status === "active"
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            {school.status === "active" ? "Suspend" : "Activate"}
          </button>
        </div>
      </div>

      {newKey && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <p className="text-xs text-amber-400 font-medium mb-1">New API Key Generated</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Copy this key now. It will not be shown again.</p>
          <code className="block bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-800 dark:text-zinc-200 break-all select-all">
            {newKey}
          </code>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-medium">API Keys</h3>
          </div>
          <button
            onClick={handleGenerateKey}
            disabled={generating}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg px-3 py-1.5"
          >
            {generating ? "Generating..." : "Generate Key"}
          </button>
        </div>
        {apiKeys && apiKeys.length > 0 ? (
          <div className="space-y-2">
            {apiKeys.map((key: ApiKey) => (
              <div key={key.id} className="flex items-center justify-between bg-zinc-100 dark:bg-zinc-800/50 rounded-lg px-3 py-2">
                <div>
                  <code className="text-xs font-mono text-zinc-300 dark:text-zinc-700 dark:text-zinc-300">{key.key_prefix}...{key.key_display}</code>
                  <div className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
                    {key.scopes.join(", ")} &middot; {key.rate_limit} req/min
                    {key.last_used_at && ` &middot; Last used: ${key.last_used_at}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    key.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {key.status}
                  </span>
                  {key.status === "active" && (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400 dark:text-zinc-600">No API keys yet</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-medium">Diagnostic Tools</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: "Test DB Connection", type: "db" },
              { label: "Ping API", type: "api" },
              { label: "Check Cache", type: "cache" },
              { label: "Verify Keys", type: "keys" },
            ].map(({ label, type }) => (
              <button
                key={type}
                onClick={() => runDiagnostic(type)}
                className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2 transition-colors"
              >
                {label}
              </button>
            ))}
            {diagResult && (
              <p style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "rgba(255,255,255,0.05)", fontSize: "0.88rem" }}>
                {diagResult}
              </p>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-medium">Recent Activity</h3>
          </div>
          <p className="text-sm text-zinc-400 dark:text-zinc-600">No recent incidents</p>
        </div>
      </div>
    </div>
  );
}
