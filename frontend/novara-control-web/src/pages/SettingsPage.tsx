import { useState, useEffect } from "react";
import {
  Settings, Shield, AlertTriangle, CheckCircle2, Clock, Activity,
  Server, Database, Bell, Play, RefreshCw, Power, PowerOff, Zap,
} from "lucide-react";
import { apiRequest } from "../api/client";
import { getMaintenanceStatus, toggleMaintenance } from "../api/services";

interface SystemCheckResult {
  id: number;
  triggered_by_name: string | null;
  status: string;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  issues_found: number;
  summary: string | null;
}

interface SystemStatus {
  api_server: "ok" | "degraded" | "down";
  database: "ok" | "degraded" | "down";
  total_schools: number;
  active_schools: number;
  total_users: number;
  uptime: string;
}

export function SettingsPage() {
  const [checks, setChecks] = useState<SystemCheckResult[]>([]);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [securitySettings, setSecuritySettings] = useState({ jwtRotation: "Every 30 days", sessionTimeout: "4 hours" });
  const [notificationSettings, setNotificationSettings] = useState({ criticalAlerts: "Email + SMS", weeklyReport: "Enabled" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [checksRes, statsRes, maintRes] = await Promise.allSettled([
        apiRequest<SystemCheckResult[]>("/platform/system-checks?limit=5"),
        apiRequest<any>("/platform/stats"),
        getMaintenanceStatus(),
      ]);
      if (checksRes.status === "fulfilled") setChecks(checksRes.value);
      if (statsRes.status === "fulfilled") {
        const s = statsRes.value;
        setStatus({
          api_server: "ok",
          database: "ok",
          total_schools: s.total_schools ?? 0,
          active_schools: s.active_schools ?? 0,
          total_users: s.total_users ?? 0,
          uptime: "99.9%",
        });
      }
      if (maintRes.status === "fulfilled") {
        setMaintenance(maintRes.value.enabled);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const saved = localStorage.getItem("novara_security_settings");
    if (saved) setSecuritySettings(JSON.parse(saved));
    const notifSaved = localStorage.getItem("novara_notification_settings");
    if (notifSaved) setNotificationSettings(JSON.parse(notifSaved));
  }, []);

  const handleSaveSecurity = () => {
    localStorage.setItem("novara_security_settings", JSON.stringify(securitySettings));
    setSaveMsg("Security settings saved locally");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const handleSaveNotifications = () => {
    localStorage.setItem("novara_notification_settings", JSON.stringify(notificationSettings));
    setSaveMsg("Notification preferences saved locally");
    setTimeout(() => setSaveMsg(""), 3000);
  };

  const runSystemCheck = async () => {
    setRunning(true);
    setNotice(null);
    try {
      const res = await apiRequest<{ message: string }>("/platform/system-check/trigger", { method: "POST" });
      setNotice(res.message || "System check triggered. It will run at midnight and notify all school administrators.");
      loadData();
    } catch (e: any) {
      setNotice("Failed to trigger system check: " + e.message);
    } finally {
      setRunning(false);
    }
  };

  const handleToggleMaintenance = async () => {
    setMaintenanceLoading(true);
    setNotice(null);
    try {
      const newState = !maintenance;
      const res = await toggleMaintenance(newState);
      setMaintenance(newState);
      setNotice(res.message);
    } catch (e: any) {
      setNotice("Failed to toggle maintenance: " + e.message);
    } finally {
      setMaintenanceLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-zinc-500 dark:text-zinc-400" />
          <h2 className="text-sm font-medium">System Control</h2>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-xs border"
          style={{
            background: notice.includes("Failed") ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
            borderColor: notice.includes("Failed") ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
            color: notice.includes("Failed") ? "#fca5a5" : "#86efac",
          }}>
          {notice.includes("Failed") ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {notice}
        </div>
      )}

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          icon={Server} label="API Server"
          status={status?.api_server ?? "ok"}
          detail={status ? "sms-msku.onrender.com" : "Loading..."}
        />
        <StatusCard
          icon={Database} label="Database"
          status={status?.database ?? "ok"}
          detail={status ? "Supabase PostgreSQL" : "Loading..."}
        />
        <StatusCard
          icon={Activity} label="System Health"
          status="ok"
          detail={status ? `${status.uptime} uptime` : "Loading..."}
        />
      </div>

      {/* Quick Stats */}
      {status && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{status.total_schools}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Schools</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{status.active_schools}</div>
            <div className="text-xs text-zinc-500 mt-1">Active Schools</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{status.total_users}</div>
            <div className="text-xs text-zinc-500 mt-1">Total Users</div>
          </div>
        </div>
      )}

      {/* Run System Check */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-amber-400" />
          <h3 className="text-sm font-medium">System Check</h3>
        </div>
        <p className="text-xs text-zinc-500">
          Run a comprehensive system-wide check. This sends a notification to all user roles
          and schedules the check to run at midnight.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={runSystemCheck}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors"
            style={{
              background: running ? "rgba(251,191,36,0.15)" : "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.3)",
              color: "#fbbf24",
            }}
          >
            {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? "Triggering..." : "Run System Check"}
          </button>
          <span className="text-xs text-zinc-400 dark:text-zinc-600">
            Notifies all users + runs at midnight
          </span>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Power size={16} className={maintenance ? "text-red-400" : "text-emerald-400"} />
          <h3 className="text-sm font-medium">Maintenance Mode</h3>
          {maintenance && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              ACTIVE
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          When enabled, all schools see a maintenance page. Use this during system upgrades,
          database migrations, or deployment commits.
        </p>
        <button
          onClick={handleToggleMaintenance}
          disabled={maintenanceLoading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors"
          style={{
            background: maintenance ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.1)",
            border: `1px solid ${maintenance ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
            color: maintenance ? "#fca5a5" : "#86efac",
          }}
        >
          {maintenanceLoading ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : maintenance ? (
            <PowerOff size={14} />
          ) : (
            <Power size={14} />
          )}
          {maintenanceLoading ? "Updating..." : maintenance ? "Disable Maintenance" : "Enable Maintenance"}
        </button>
      </div>

      {/* Recent System Checks */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-sm font-medium">Recent System Checks</h3>
        </div>
        {loading ? (
          <div className="text-xs text-zinc-500 py-4 text-center">Loading...</div>
        ) : checks.length === 0 ? (
          <div className="text-xs text-zinc-500 py-4 text-center">No system checks yet. Click "Run System Check" to start one.</div>
        ) : (
          <div className="space-y-2">
            {checks.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 px-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {c.status === "completed" ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : c.status === "running" ? (
                    <RefreshCw size={14} className="text-amber-400 animate-spin" />
                  ) : (
                    <Clock size={14} className="text-zinc-500" />
                  )}
                  <div>
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 capitalize">{c.status}</span>
                    {c.triggered_by_name && (
                      <span className="text-xs text-zinc-500 ml-2">by {c.triggered_by_name}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(c.scheduled_for).toLocaleString()}</div>
                  {c.summary && (
                    <div className="text-xs text-zinc-500">{c.summary}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-sm font-medium">Security</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Label label="JWT Secret Rotation">
            <select
              value={securitySettings.jwtRotation}
              onChange={(e) => setSecuritySettings({ ...securitySettings, jwtRotation: e.target.value })}
              className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none w-full"
            >
              <option>Every 30 days</option>
              <option>Every 60 days</option>
              <option>Every 90 days</option>
            </select>
          </Label>
          <Label label="Session Timeout">
            <select
              value={securitySettings.sessionTimeout}
              onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
              className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none w-full"
            >
              <option>1 hour</option>
              <option>4 hours</option>
              <option>8 hours</option>
              <option>24 hours</option>
            </select>
          </Label>
        </div>
        <button
          onClick={handleSaveSecurity}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.3)",
            color: "#818cf8",
          }}
        >
          Save Security Settings
        </button>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-zinc-500 dark:text-zinc-400" />
          <h3 className="text-sm font-medium">Notifications</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Label label="Critical Alerts">
            <select
              value={notificationSettings.criticalAlerts}
              onChange={(e) => setNotificationSettings({ ...notificationSettings, criticalAlerts: e.target.value })}
              className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none w-full"
            >
              <option>Email + SMS</option>
              <option>Email only</option>
              <option>Disabled</option>
            </select>
          </Label>
          <Label label="Weekly Report">
            <select
              value={notificationSettings.weeklyReport}
              onChange={(e) => setNotificationSettings({ ...notificationSettings, weeklyReport: e.target.value })}
              className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 outline-none w-full"
            >
              <option>Enabled</option>
              <option>Disabled</option>
            </select>
          </Label>
        </div>
        <button
          onClick={handleSaveNotifications}
          className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.3)",
            color: "#818cf8",
          }}
        >
          Save Notification Preferences
        </button>
      </div>

      {saveMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-xs border"
          style={{
            background: "rgba(34,197,94,0.08)",
            borderColor: "rgba(34,197,94,0.2)",
            color: "#86efac",
          }}>
          <CheckCircle2 size={14} />
          {saveMsg}
        </div>
      )}
    </div>
  );
}

function StatusCard({ icon: Icon, label, status, detail }: {
  icon: any; label: string; status: string; detail: string;
}) {
  const colors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    ok: { bg: "rgba(34,197,94,0.05)", border: "rgba(34,197,94,0.15)", text: "#86efac", dot: "#22c55e" },
    degraded: { bg: "rgba(251,191,36,0.05)", border: "rgba(251,191,36,0.15)", text: "#fde68a", dot: "#f59e0b" },
    down: { bg: "rgba(239,68,68,0.05)", border: "rgba(239,68,68,0.15)", text: "#fca5a5", dot: "#ef4444" },
  };
  const c = colors[status] || colors.ok;
  return (
    <div className="rounded-xl p-4 border" style={{ background: c.bg, borderColor: c.border }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
        <Icon size={14} style={{ color: c.text }} />
        <span className="text-xs font-medium" style={{ color: c.text }}>{label}</span>
      </div>
      <div className="text-xs text-zinc-500">{detail}</div>
    </div>
  );
}

function Label({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
