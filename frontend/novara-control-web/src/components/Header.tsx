import { useState, useEffect, useRef } from "react";
import { Menu, Bell, Sun, Moon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getNotifications } from "../api/services";

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
  theme: string;
  onToggleTheme: () => void;
}

export function Header({ onToggleSidebar, title, theme, onToggleTheme }: HeaderProps) {
  const { admin } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getNotifications().then(setNotifications).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifications]);

  return (
    <header
      className="h-14 border-b flex items-center justify-between px-4 sticky top-0 z-10"
      style={{
        background: "var(--bg-header)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg hover:opacity-70"
          style={{ color: "var(--text-muted)" }}
        >
          <Menu size={20} />
        </button>
        <h1 className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg"
          style={{ color: "var(--text-muted)" }}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-lg relative"
            style={{ color: "var(--text-muted)" }}
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          {showNotifications && (
            <div
              style={{
                position: "absolute", top: "100%", right: 0, width: 320, maxHeight: 400,
                overflow: "auto", background: "rgba(30,41,59,0.95)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, padding: 12, zIndex: 100, backdropFilter: "blur(20px)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.4)"
              }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text)" }}>Recent Activity</p>
              {notifications.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>No recent activity</p>
              ) : (
                notifications.slice(0, 10).map((n, i) => (
                  <div
                    key={i}
                    className="mb-2 last:mb-0 pb-2 last:pb-0"
                    style={{ borderBottom: i < Math.min(notifications.length, 10) - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                  >
                    <p className="text-xs" style={{ color: "var(--text)" }}>{n.action || n.description || n.detail || "System event"}</p>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{n.created_at?.split("T")[0] || ""}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
            {admin?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <span className="hidden sm:inline text-xs" style={{ color: "var(--text-muted)" }}>{admin?.name}</span>
        </div>
      </div>
    </header>
  );
}
