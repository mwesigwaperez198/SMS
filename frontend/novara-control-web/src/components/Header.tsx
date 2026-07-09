import { Menu, Bell, Sun, Moon } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
  theme: string;
  onToggleTheme: () => void;
}

export function Header({ onToggleSidebar, title, theme, onToggleTheme }: HeaderProps) {
  const { admin } = useAuth();

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
        <button className="p-1.5 rounded-lg relative" style={{ color: "var(--text-muted)" }}>
          <Bell size={18} />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
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
