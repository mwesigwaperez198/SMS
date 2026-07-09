import { Settings, Shield, Bell, Mail, Globe } from "lucide-react";

export function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Settings size={18} className="text-zinc-400" />
        <h2 className="text-sm font-medium">Settings</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-zinc-400" />
            <h3 className="text-sm font-medium">Security</h3>
          </div>
          <Label label="JWT Secret Rotation">
            <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 outline-none">
              <option>Every 30 days</option>
              <option>Every 60 days</option>
              <option>Every 90 days</option>
            </select>
          </Label>
          <Label label="Session Timeout">
            <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 outline-none">
              <option>1 hour</option>
              <option>4 hours</option>
              <option>8 hours</option>
              <option>24 hours</option>
            </select>
          </Label>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-zinc-400" />
            <h3 className="text-sm font-medium">Notifications</h3>
          </div>
          <Label label="Critical Alerts">
            <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 outline-none">
              <option>Email + SMS</option>
              <option>Email only</option>
              <option>Disabled</option>
            </select>
          </Label>
          <Label label="Weekly Report">
            <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 outline-none">
              <option>Enabled</option>
              <option>Disabled</option>
            </select>
          </Label>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-zinc-400" />
            <h3 className="text-sm font-medium">Email Configuration</h3>
          </div>
          <Label label="SMTP Host">
            <input defaultValue="smtp.novara.tech" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 outline-none" />
          </Label>
          <Label label="SMTP Port">
            <input defaultValue="587" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 outline-none" />
          </Label>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-zinc-400" />
            <h3 className="text-sm font-medium">API Gateway</h3>
          </div>
          <Label label="Default Rate Limit">
            <input defaultValue="100" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 outline-none" />
          </Label>
          <Label label="Maintenance Mode">
            <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300 outline-none">
              <option>Disabled</option>
              <option>Enabled (all schools see 503)</option>
            </select>
          </Label>
        </div>
      </div>
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
