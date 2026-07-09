import { Menu, Bell } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
}

export function Header({ onToggleSidebar, title }: HeaderProps) {
  const { admin } = useAuth();

  return (
    <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-sm font-medium truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 relative">
          <Bell size={18} />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
            {admin?.name?.charAt(0)?.toUpperCase() || "A"}
          </div>
          <span className="hidden sm:inline text-zinc-300 text-xs">{admin?.name}</span>
        </div>
      </div>
    </header>
  );
}
