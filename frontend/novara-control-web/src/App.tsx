import { useState } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SchoolsListPage } from "./pages/SchoolsListPage";
import { SchoolDetailPage } from "./pages/SchoolDetailPage";
import { PlansPage } from "./pages/PlansPage";
import { HealthPage } from "./pages/HealthPage";
import { AuditPage } from "./pages/AuditPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { IncidentsPage } from "./pages/IncidentsPage";
import { SettingsPage } from "./pages/SettingsPage";

const viewTitles: Record<string, string> = {
  dashboard: "Dashboard",
  schools: "Schools",
  plans: "Subscription Plans",
  "api-keys": "API Keys",
  health: "System Health",
  audit: "Audit Trail",
  payments: "Payments",
  incidents: "Incidents",
  settings: "Settings",
};

function AppContent() {
  const { admin, logout } = useAuth();
  const [view, setView] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);

  if (!admin) return <LoginPage />;

  const handleNavigate = (v: string) => {
    setView(v);
    setSelectedSchoolId(null);
    setSidebarCollapsed(true);
  };

  const handleSelectSchool = (id: number) => {
    setSelectedSchoolId(id);
    setView("school-detail");
  };

  const title = view === "school-detail"
    ? "School Detail"
    : (viewTitles[view] || "NOVARA Control");

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      <Sidebar
        activeView={view}
        onNavigate={handleNavigate}
        onLogout={logout}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-16">
        <Header
          title={title}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 overflow-y-auto">
          {view === "dashboard" && <DashboardPage />}
          {view === "schools" && <SchoolsListPage onSelectSchool={handleSelectSchool} />}
          {view === "school-detail" && selectedSchoolId && (
            <SchoolDetailPage
              schoolId={selectedSchoolId}
              onBack={() => handleNavigate("schools")}
            />
          )}
          {view === "plans" && <PlansPage />}
          {view === "api-keys" && <SchoolsListPage onSelectSchool={handleSelectSchool} />}
          {view === "health" && <HealthPage />}
          {view === "audit" && <AuditPage />}
          {view === "payments" && <PaymentsPage />}
          {view === "incidents" && <IncidentsPage />}
          {view === "settings" && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
