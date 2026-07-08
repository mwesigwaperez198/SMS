import {
  AlertCircle,
  Bell,
  BookOpen,
  Bus,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Download,
  FileCheck2,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Image,
  MapPin,
  Megaphone,
  Library,
  LogOut,
  Menu,
  MessageSquare,
  MonitorDot,
  Moon,
  Palette,
  Plus,
  ReceiptText,
  RefreshCcw,
  Save,
  School,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  api,
  ApiError,
  Assessment,
  AttendanceRecord,
  Circular,
  ClassAttendanceRecord,
  ClassRoom,
  Fee,
  FeeDashboard,
  FinanceLedgerRow,
  Message,
  Requirement,
  Role,
  runtimeConfig,
  StaffSummary,
  StudentRecord,
  Transport,
  User,
  UserSummary,
} from "./api";

type Session = {
  token: string;
  user: User;
};

type DashboardData = {
  attendance?: AttendanceRecord[];
  fees?: Fee[];
  feeDashboard?: FeeDashboard;
  circulars?: Circular[];
  messages?: Message[];
  users?: UserSummary[];
  roles?: Role[];
  transport?: Transport;
  staffSummary?: StaffSummary;
  students?: StudentRecord[];
  classes?: ClassRoom[];
  assessments?: Assessment[];
  requirements?: Requirement[];
  financeLedger?: FinanceLedgerRow[];
};

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  principal: "Principal",
  teacher: "Teacher",
  dos: "DOS",
  student: "Student",
  parent: "Parent",
  accountant: "Accountant",
  librarian: "Librarian",
  transport_manager: "Transport",
  receptionist: "Reception",
};

const roleNav: Record<Role, string[]> = {
  super_admin: ["Overview", "Students", "Attendance", "Assessments", "Finance", "Requirements", "Users", "Messages", "Settings"],
  school_admin: ["Overview", "Students", "Attendance", "Assessments", "Finance", "Requirements", "Users", "Messages", "Settings"],
  principal: ["Overview", "Students", "Attendance", "Assessments", "Finance", "Requirements", "Users", "Messages", "Settings"],
  teacher: ["Overview", "Students", "Attendance", "Assessments", "Messages"],
  dos: ["Overview", "Students", "Attendance", "Assessments", "Requirements", "Messages"],
  student: ["Overview", "Academics", "Finance", "Transport", "Messages"],
  parent: ["Overview", "Academics", "Finance", "Transport", "Messages"],
  accountant: ["Overview", "Students", "Finance", "Requirements", "Users", "Messages"],
  librarian: ["Overview", "Library", "Messages"],
  transport_manager: ["Overview", "Transport", "Users", "Messages"],
  receptionist: ["Overview", "Students", "Requirements", "Users", "Messages"],
};

const portalName = runtimeConfig.appName || "NovaAdmin";
const portalSubtitle = runtimeConfig.portalSubtitle || "School management portal";
const allowedRoles = (runtimeConfig.allowedRoles || []) as Role[];
const storageKey = runtimeConfig.storageKey || "novaadmin.session";
type ThemeName = "light" | "dark" | "contrast";
const themeStorageKey = `${storageKey}.theme`;
const officeRoles: Role[] = ["super_admin", "school_admin", "principal", "teacher", "dos", "accountant", "receptionist"];
const academicRoles: Role[] = ["super_admin", "school_admin", "principal", "teacher", "dos"];
const financeRoles: Role[] = ["super_admin", "school_admin", "principal", "accountant", "receptionist"];
const studentActions = [
  "profile",
  "attendance",
  "homework",
  "academics",
  "messages",
  "calendar",
  "finance",
  "pay",
  "library",
  "results",
  "timetable",
  "leave",
  "downloads",
  "gallery",
  "transport",
  "bus",
] as const;
type StudentAction = (typeof studentActions)[number];

function isThemeName(value: string | null): value is ThemeName {
  return value === "light" || value === "dark" || value === "contrast";
}

function getStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    return isThemeName(stored) ? stored : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(themeStorageKey, theme);
  const themeColor = theme === "dark" ? "#172033" : theme === "contrast" ? "#111827" : "#0f766e";
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", themeColor);
}

function isRoleAllowed(role: Role) {
  return allowedRoles.length === 0 || allowedRoles.includes(role);
}

function formatMoney(value = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getStoredSession(): Session | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    localStorage.removeItem(storageKey);
    return null;
  }
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const storedSession = getStoredSession();
    if (storedSession && !isRoleAllowed(storedSession.user.role)) {
      localStorage.removeItem(storageKey);
      return null;
    }
    return storedSession;
  });
  const [apiStatus, setApiStatus] = useState<"checking" | "ready" | "down">("checking");
  const [theme, setTheme] = useState<ThemeName>(() => getStoredTheme());

  useEffect(() => {
    document.title = portalName;
    api
      .ready()
      .then((response) => setApiStatus(response?.status === "ready" ? "ready" : "down"))
      .catch(() => setApiStatus("down"));
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const onSession = (nextSession: Session) => {
    localStorage.setItem(storageKey, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const logout = () => {
    localStorage.removeItem(storageKey);
    setSession(null);
  };

  if (!session) {
    return <LoginScreen apiStatus={apiStatus} onSession={onSession} />;
  }

  return <Shell apiStatus={apiStatus} session={session} logout={logout} theme={theme} onThemeChange={setTheme} />;
}

function LoginScreen({
  apiStatus,
  onSession,
}: {
  apiStatus: "checking" | "ready" | "down";
  onSession: (session: Session) => void;
}) {
  const [identifier, setIdentifier] = useState(runtimeConfig.defaultIdentifier || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.login(identifier, password);
      if (!response?.token || !response?.user) {
        throw new ApiError(0, "Login did not return a user session. Check the backend API URL in config.js.");
      }
      if (!isRoleAllowed(response.user.role)) {
        throw new ApiError(
          403,
          runtimeConfig.forbiddenRoleMessage ||
            `This portal is not enabled for ${roleLabels[response.user.role]} accounts.`,
        );
      }
      onSession(response);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-row">
          <div className="brand-mark">
            <School size={24} />
          </div>
          <div>
            <h1>{portalName}</h1>
            <p>{portalSubtitle}</p>
          </div>
        </div>
        <p className={apiStatus === "ready" ? "portal-status ready" : "portal-status"}>
          {apiStatus === "ready" ? "API online" : apiStatus === "down" ? "API offline" : "Checking API"}
        </p>
        <p className={apiStatus === "ready" ? "api-target ready" : "api-target"}>
          API: <span>{api.baseUrl}</span>
        </p>

        <form onSubmit={submit} className="login-form">
          <label>
            Email or phone
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              placeholder={runtimeConfig.loginPlaceholder || "Email or phone"}
            />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={loading || !identifier || !password}>
            <ShieldCheck size={18} />
            {loading ? "Signing in" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Shell({
  apiStatus,
  session,
  logout,
  theme,
  onThemeChange,
}: {
  apiStatus: "checking" | "ready" | "down";
  session: Session;
  logout: () => void;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}) {
  const [active, setActive] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const nav = roleNav[session.user.role] || roleNav.student;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const canUseOffice = officeRoles.includes(session.user.role);
    const canUseFinance = financeRoles.includes(session.user.role);
    const canUseStudentData = ["student", "parent"].includes(session.user.role);
    const currentMonth = new Date().toISOString().slice(0, 7);

    Promise.allSettled([
      canUseStudentData ? api.attendance(session.token, currentMonth) : Promise.resolve([]),
      api.feeDashboard(session.token),
      api.fees(session.token),
      api.circulars(session.token),
      api.messages(session.token),
      api.transport(session.token),
      canUseOffice ? api.staffSummary(session.token) : Promise.resolve(undefined),
      canUseOffice ? api.students(session.token) : Promise.resolve([]),
      canUseOffice ? api.classes(session.token) : Promise.resolve([]),
      academicRoles.includes(session.user.role) ? api.assessments(session.token) : Promise.resolve([]),
      canUseOffice ? api.requirements(session.token) : Promise.resolve([]),
      canUseFinance ? api.financeLedger(session.token) : Promise.resolve([]),
      ["super_admin", "school_admin", "principal", "dos", "accountant", "transport_manager", "receptionist"].includes(
        session.user.role,
      )
        ? api.users(session.token)
        : Promise.resolve([]),
      ["super_admin", "school_admin", "principal", "dos"].includes(session.user.role)
        ? api.roles(session.token)
        : Promise.resolve({ roles: [] }),
    ]).then((results) => {
      if (!alive) return;
      const [
        attendance,
        feeDashboard,
        fees,
        circulars,
        messages,
        transport,
        staffSummary,
        students,
        classes,
        assessments,
        requirements,
        financeLedger,
        users,
        roles,
      ] = results;
      const next: DashboardData = {};
      if (attendance.status === "fulfilled") next.attendance = attendance.value;
      if (feeDashboard.status === "fulfilled") next.feeDashboard = feeDashboard.value;
      if (fees.status === "fulfilled") next.fees = fees.value;
      if (circulars.status === "fulfilled") next.circulars = circulars.value;
      if (messages.status === "fulfilled") next.messages = messages.value;
      if (transport.status === "fulfilled") next.transport = transport.value;
      if (staffSummary.status === "fulfilled") next.staffSummary = staffSummary.value;
      if (students.status === "fulfilled") next.students = students.value;
      if (classes.status === "fulfilled") next.classes = classes.value;
      if (assessments.status === "fulfilled") next.assessments = assessments.value;
      if (requirements.status === "fulfilled") next.requirements = requirements.value;
      if (financeLedger.status === "fulfilled") next.financeLedger = financeLedger.value;
      if (users.status === "fulfilled") next.users = users.value;
      if (roles.status === "fulfilled") next.roles = roles.value.roles;
      setData(next);
      setError(results.every((result) => result.status === "rejected") ? "Unable to load dashboard data" : "");
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, [session]);

  const userInitials = useMemo(() => {
    return session.user.name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }, [session.user.name]);

  return (
    <div className="app-shell">
      <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
        <div className="brand-row compact">
          <div className="brand-mark">
            <School size={22} />
          </div>
          <div>
            <h1>NovaAdmin</h1>
            <p>{session.user.school_name}</p>
          </div>
          <button className="icon-button close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav>
          {nav.map((item) => (
            <button
              key={item}
              className={active === item ? "nav-item active" : "nav-item"}
              onClick={() => {
                setActive(item);
                setSidebarOpen(false);
              }}
            >
              {navIcon(item)}
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">{roleLabels[session.user.role]}</p>
            <h2>{active}</h2>
          </div>
          <div className="topbar-actions">
            <span className={apiStatus === "ready" ? "status-pill ready" : "status-pill down"}>
              {apiStatus === "ready" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {apiStatus === "ready" ? "Ready" : "Offline"}
            </span>
            <div className="user-chip">
              <span>{userInitials}</span>
              <div>
                <strong>{session.user.name}</strong>
                <small>{session.user.email}</small>
              </div>
            </div>
            <button className="icon-button" onClick={logout} aria-label="Sign out">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {error && <div className="notice error">{error}</div>}
        {loading ? (
          <LoadingState />
        ) : (
          <Dashboard
            active={active}
            data={data}
            token={session.token}
            user={session.user}
            theme={theme}
            onThemeChange={onThemeChange}
          />
        )}
      </main>
    </div>
  );
}

function Dashboard({
  active,
  data,
  token,
  user,
  theme,
  onThemeChange,
}: {
  active: string;
  data: DashboardData;
  token: string;
  user: User;
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}) {
  if (active === "Overview" && ["student", "parent"].includes(user.role)) {
    return <StudentPortal data={data} user={user} />;
  }
  if (active === "Students") return <StudentsOfficeView classes={data.classes || []} students={data.students || []} />;
  if (active === "Attendance")
    return <AttendanceOfficeView classes={data.classes || []} students={data.students || []} token={token} />;
  if (active === "Assessments")
    return <AssessmentsOfficeView assessments={data.assessments || []} classes={data.classes || []} token={token} />;
  if (active === "Requirements")
    return <RequirementsOfficeView requirements={data.requirements || []} students={data.students || []} token={token} />;
  if (active === "Users") return <UsersView users={data.users || []} roles={data.roles || []} />;
  if (active === "Finance")
    return <FinanceOfficeView ledger={data.financeLedger || []} fees={data.fees || []} summary={data.feeDashboard} />;
  if (active === "Transport") return <TransportView transport={data.transport} />;
  if (active === "Messages") return <MessagesView messages={data.messages || []} />;
  if (active === "Library") return <ModuleQueue title="Library" icon={<Library size={20} />} />;
  if (active === "Schools") return <ModuleQueue title="Schools" icon={<School size={20} />} />;
  if (active === "Academics") return <AcademicsView circulars={data.circulars || []} />;
  if (active === "Settings") return <AdminSettingsView theme={theme} onThemeChange={onThemeChange} user={user} />;
  return <Overview data={data} user={user} />;
}

function Overview({ data, user }: { data: DashboardData; user: User }) {
  const userCount = data.users?.length || 0;
  const students = data.staffSummary?.students ?? data.users?.filter((item) => item.role === "student").length ?? userCount;
  const parents = data.staffSummary?.parents ?? data.users?.filter((item) => item.role === "parent").length ?? 0;
  const teachers = data.staffSummary?.teachers ?? data.users?.filter((item) => item.role === "teacher").length ?? 0;
  const presentToday = data.staffSummary?.attendance_present_today ?? 0;

  return (
    <section className="admin-dashboard">
      <section className="metric-grid">
        <Metric icon={<GraduationCap />} label="Students" value={`${students}`} tone="green" />
        <Metric icon={<Users />} label="Teachers" value={`${teachers}`} tone="blue" />
        <Metric icon={<UserRound />} label="Parents" value={`${parents}`} tone="amber" />
        <Metric icon={<ClipboardCheck />} label="Present Today" value={`${presentToday}`} tone="teal" />
      </section>

      <section className="admin-grid">
        <FeesChart summary={data.feeDashboard} />
        <SocialTiles />
        <EventCalendar />
        <Announcements circulars={data.circulars || []} />
        <MessagesView messages={(data.messages || []).slice(0, 4)} compact />
        <SchoolLinkPanel user={user} />
      </section>
    </section>
  );
}

function StudentPortal({ data, user }: { data: DashboardData; user: User }) {
  const [activeTile, setActiveTile] = useState<StudentAction>("profile");
  const tiles: Array<{ label: string; icon: React.ReactNode; tone: string; action: StudentAction }> = [
    { label: "My Profile", icon: <UserRound />, tone: "rose", action: "profile" },
    { label: "Attendance", icon: <ClipboardList />, tone: "blue", action: "attendance" },
    { label: "Homework", icon: <BookOpen />, tone: "violet", action: "homework" },
    { label: "Circulars", icon: <FileText />, tone: "cyan", action: "academics" },
    { label: "Remarks", icon: <MessageSquare />, tone: "teal", action: "messages" },
    { label: "Calendar", icon: <CalendarDays />, tone: "red", action: "calendar" },
    { label: "Fees", icon: <CircleDollarSign />, tone: "amber", action: "finance" },
    { label: "Pay Online", icon: <CreditCard />, tone: "sky", action: "pay" },
    { label: "Library", icon: <Library />, tone: "orange", action: "library" },
    { label: "Results", icon: <ClipboardList />, tone: "cyan", action: "results" },
    { label: "Communication", icon: <MessageSquare />, tone: "pink", action: "messages" },
    { label: "Timetable", icon: <CalendarDays />, tone: "green", action: "timetable" },
    { label: "Apply Leave", icon: <FileText />, tone: "blue", action: "leave" },
    { label: "Downloads", icon: <Download />, tone: "violet", action: "downloads" },
    { label: "Announcements", icon: <Megaphone />, tone: "amber", action: "academics" },
    { label: "Image Gallery", icon: <Image />, tone: "rose", action: "gallery" },
    { label: "Track", icon: <MapPin />, tone: "teal", action: "transport" },
    { label: "Bus Attendance", icon: <Bus />, tone: "red", action: "bus" },
  ];

  return (
    <section className="student-dashboard">
      <div className="student-hero">
        <div className="student-avatar">{user.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <h3>{user.name}</h3>
          <p>{user.class_name || roleLabels[user.role]}</p>
        </div>
      </div>
      <div className="student-grid">
        {tiles.map((tile) => (
          <button
            aria-pressed={activeTile === tile.action}
            className={`student-tile ${tile.tone}${activeTile === tile.action ? " active" : ""}`}
            key={tile.label}
            onClick={() => setActiveTile(tile.action)}
            type="button"
          >
            {tile.icon}
            <span>{tile.label}</span>
          </button>
        ))}
      </div>
      <StudentActionPanel action={activeTile} data={data} user={user} />
      <section className="student-summary">
        <Metric icon={<CircleDollarSign />} label="Fees Due" value={formatMoney(data.feeDashboard?.total_due || 0)} tone="amber" />
        <Metric icon={<Bell />} label="Messages" value={`${data.messages?.length || 0}`} tone="blue" />
      </section>
    </section>
  );
}

function StudentActionPanel({ action, data, user }: { action: StudentAction; data: DashboardData; user: User }) {
  if (action === "profile") {
    return (
      <section className="detail-panel student-action-panel">
        <div className="panel-header">
          <div>
            <h3>My Profile</h3>
            <p>{user.school_name}</p>
          </div>
          <UserRound size={22} />
        </div>
        <div className="profile-grid">
          <Detail label="Name" value={user.name} />
          <Detail label="Class" value={user.class_name || roleLabels[user.role]} />
          <Detail label="Email" value={user.email || "Not set"} />
          <Detail label="Phone" value={user.phone || "Not set"} />
        </div>
      </section>
    );
  }

  if (action === "attendance") {
    return <StudentAttendancePanel attendance={data.attendance || []} />;
  }

  if (action === "academics") {
    return <Announcements circulars={data.circulars || []} />;
  }

  if (action === "messages") {
    return <MessagesView messages={data.messages || []} />;
  }

  if (action === "finance" || action === "pay") {
    return <StudentFinancePanel fees={data.fees || []} mode={action} summary={data.feeDashboard} />;
  }

  if (action === "transport" || action === "bus") {
    return <TransportView transport={data.transport} />;
  }

  const modules: Record<
    Exclude<StudentAction, "profile" | "attendance" | "academics" | "messages" | "finance" | "pay" | "transport" | "bus">,
    { title: string; icon: React.ReactNode }
  > = {
    homework: { title: "Homework", icon: <BookOpen size={20} /> },
    calendar: { title: "Calendar", icon: <CalendarDays size={20} /> },
    library: { title: "Library", icon: <Library size={20} /> },
    results: { title: "Results", icon: <ClipboardList size={20} /> },
    timetable: { title: "Timetable", icon: <CalendarDays size={20} /> },
    leave: { title: "Apply Leave", icon: <FileText size={20} /> },
    downloads: { title: "Downloads", icon: <Download size={20} /> },
    gallery: { title: "Image Gallery", icon: <Image size={20} /> },
  };

  const module = modules[action];
  return <ModuleQueue title={module.title} icon={module.icon} />;
}

function StudentAttendancePanel({ attendance }: { attendance: AttendanceRecord[] }) {
  return (
    <section className="detail-panel student-action-panel">
      <div className="panel-header">
        <div>
          <h3>Attendance</h3>
          <p>{attendance.length} records this month</p>
        </div>
        <ClipboardList size={22} />
      </div>
      {attendance.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Subject</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((record) => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  <td>{record.subject || "Class"}</td>
                  <td>
                    <span className={record.status === "present" ? "badge success" : "badge warning"}>{record.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No attendance records for this month" />
      )}
    </section>
  );
}

function StudentFinancePanel({
  fees,
  mode,
  summary,
}: {
  fees: Fee[];
  mode: "finance" | "pay";
  summary?: FeeDashboard;
}) {
  const [notice, setNotice] = useState("");

  return (
    <section className="detail-panel student-action-panel">
      <div className="panel-header">
        <div>
          <h3>{mode === "pay" ? "Pay Online" : "Fees"}</h3>
          <p>Current balance and invoices</p>
        </div>
        <CircleDollarSign size={22} />
      </div>
      <div className="finance-mini-grid">
        <Detail label="Paid" value={formatMoney(summary?.total_paid || 0)} />
        <Detail label="Due" value={formatMoney(summary?.total_due || 0)} />
        <Detail label="Overdue" value={formatMoney(summary?.total_overdue || 0)} />
      </div>
      {mode === "pay" && (
        <div className="student-action-tools">
          <button
            className="tool-button primary"
            onClick={() => setNotice("Payment request opened. Use the fees invoice from accounts to complete payment.")}
            type="button"
          >
            <CreditCard size={16} />
            Request payment link
          </button>
        </div>
      )}
      {notice && <div className="notice info">{notice}</div>}
      <div className="stack-list">
        {fees.map((fee) => (
          <article className="list-row" key={fee.id}>
            <ReceiptText size={18} />
            <div>
              <strong>{fee.description}</strong>
              <p>{fee.due_date}</p>
            </div>
            <span className={fee.status === "paid" ? "badge success" : "badge warning"}>{formatMoney(fee.amount)}</span>
          </article>
        ))}
        {fees.length === 0 && <EmptyState title="No fee invoices" />}
      </div>
    </section>
  );
}

function FeesChart({ summary }: { summary?: FeeDashboard }) {
  const paid = summary?.total_paid || 0;
  const due = summary?.total_due || 0;
  const overdue = summary?.total_overdue || 0;
  const max = Math.max(paid, due, overdue, 1);

  return (
    <section className="chart-panel">
      <div className="panel-header">
        <div>
          <h3>Fees Collection & Expenses</h3>
          <p>Current term</p>
        </div>
      </div>
      <div className="bar-chart">
        {[
          ["Collections", paid, "blue"],
          ["Fees", due, "red"],
          ["Expenses", overdue, "yellow"],
        ].map(([label, value, tone]) => (
          <div className="bar-column" key={label}>
            <span>{formatMoney(Number(value))}</span>
            <div className={`bar ${tone}`} style={{ height: `${Math.max((Number(value) / max) * 140, 16)}px` }} />
            <strong>{label}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function SocialTiles() {
  return (
    <section className="social-grid">
      <article className="social-card facebook">
        <strong>30,000</strong>
        <span>Facebook</span>
      </article>
      <article className="social-card twitter">
        <strong>13,000</strong>
        <span>Twitter</span>
      </article>
      <article className="social-card google">
        <strong>9,000</strong>
        <span>Google Plus</span>
      </article>
      <article className="social-card linkedin">
        <strong>18,000</strong>
        <span>LinkedIn</span>
      </article>
    </section>
  );
}

function EventCalendar() {
  const days = Array.from({ length: 35 }, (_, index) => index + 1);
  return (
    <section className="calendar-panel">
      <div className="panel-header">
        <div>
          <h3>Event Calendar</h3>
          <p>May 2026</p>
        </div>
      </div>
      <div className="mini-calendar">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <strong key={day}>{day}</strong>
        ))}
        {days.map((day) => (
          <span className={day === 14 || day === 27 ? "event-day" : day === 18 ? "today" : ""} key={day}>
            {day <= 31 ? day : ""}
          </span>
        ))}
      </div>
    </section>
  );
}

function SchoolLinkPanel({ user }: { user: User }) {
  return (
    <section className="school-link-panel">
      <div className="panel-header">
        <div>
          <h3>School Computer Link</h3>
          <p>{user.school_name}</p>
        </div>
        <MonitorDot size={22} />
      </div>
      <div className="link-rows">
        <Detail label="Domain" value="novaadmin.kesug.com" />
        <Detail label="Sync source" value="School management system" />
      </div>
    </section>
  );
}

function StudentsOfficeView({ classes, students }: { classes: ClassRoom[]; students: StudentRecord[] }) {
  const [query, setQuery] = useState("");
  const [classId, setClassId] = useState(0);
  const filtered = students.filter((student) => {
    const matchesClass = !classId || student.class_id === classId;
    const text = `${student.name} ${student.admission_number} ${student.class_name} ${student.parent_name}`.toLowerCase();
    return matchesClass && text.includes(query.toLowerCase());
  });
  const selected = filtered[0];

  return (
    <section className="office-layout">
      <section className="table-panel">
        <div className="panel-header">
          <div>
            <h3>Student Registry</h3>
            <p>{filtered.length} active records</p>
          </div>
          <div className="office-filters">
            <label>
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Student, admission, parent" />
            </label>
            <select value={classId} onChange={(event) => setClassId(Number(event.target.value))}>
              <option value={0}>All classes</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}-{item.section}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Parent</th>
                <th>Attendance</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id}>
                  <td>
                    <strong>{student.name}</strong>
                    <small>{student.admission_number}</small>
                  </td>
                  <td>{student.class_name || "Unassigned"}</td>
                  <td>
                    <strong>{student.parent_name || "No parent link"}</strong>
                    <small>{student.parent_phone}</small>
                  </td>
                  <td>{student.attendance_percentage}%</td>
                  <td>{formatMoney(student.fees_due + student.requirements_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="detail-panel student-profile-panel">
        <div className="panel-header">
          <div>
            <h3>Profile Record</h3>
            <p>{selected ? selected.name : "No student selected"}</p>
          </div>
          <UserRound size={22} />
        </div>
        {selected ? (
          <div className="profile-grid">
            <Detail label="Admission" value={selected.admission_number || "Not set"} />
            <Detail label="Class" value={selected.class_name || "Unassigned"} />
            <Detail label="Phone" value={selected.phone || "Not set"} />
            <Detail label="Parent" value={selected.parent_name || "Not linked"} />
            <Detail label="Fees Balance" value={formatMoney(selected.fees_due)} />
            <Detail label="Requirements" value={formatMoney(selected.requirements_due)} />
            <Detail label="Paid" value={formatMoney(selected.fees_paid)} />
            <Detail label="Attendance" value={`${selected.attendance_percentage}%`} />
          </div>
        ) : (
          <EmptyState title="No student records loaded" />
        )}
      </section>
    </section>
  );
}

function AttendanceOfficeView({
  classes,
  students,
  token,
}: {
  classes: ClassRoom[];
  students: StudentRecord[];
  token: string;
}) {
  const [classId, setClassId] = useState(classes[0]?.id || 0);
  const [date, setDate] = useState(todayDate());
  const [subject, setSubject] = useState("Class");
  const [records, setRecords] = useState<ClassAttendanceRecord[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const loadRecords = () => {
    setLoading(true);
    setStatus("");
    api
      .classAttendance(token, classId || undefined, date, subject || "Class")
      .then(setRecords)
      .catch((error) => setStatus(error instanceof ApiError ? error.message : "Unable to load attendance"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  const updateRecord = (studentUserId: number, nextStatus: ClassAttendanceRecord["status"]) => {
    setRecords((current) =>
      current.map((record) => (record.student_user_id === studentUserId ? { ...record, status: nextStatus } : record)),
    );
  };

  const save = () => {
    setLoading(true);
    api
      .saveClassAttendance(token, {
        date,
        subject: subject || "Class",
        records: records
          .filter((record) => record.status !== "unmarked")
          .map((record) => ({ student_user_id: record.student_user_id, status: record.status })),
      })
      .then((response) => setStatus(`${response.saved} attendance records saved`))
      .catch((error) => setStatus(error instanceof ApiError ? error.message : "Unable to save attendance"))
      .finally(() => setLoading(false));
  };

  const visibleRecords = records.length
    ? records
    : students
        .filter((student) => !classId || student.class_id === classId)
        .map((student) => ({
          student_user_id: student.id,
          name: student.name,
          admission_number: student.admission_number,
          class_name: student.class_name,
          date,
          subject,
          status: "unmarked" as const,
        }));

  return (
    <section className="table-panel">
      <div className="panel-header">
        <div>
          <h3>Class Attendance</h3>
          <p>{visibleRecords.length} learners</p>
        </div>
        <div className="office-filters">
          <select value={classId} onChange={(event) => setClassId(Number(event.target.value))}>
            <option value={0}>All classes</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}-{item.section}
              </option>
            ))}
          </select>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject/session" />
          <button className="tool-button" onClick={loadRecords} type="button">
            <RefreshCcw size={16} />
          </button>
          <button className="tool-button primary" disabled={loading} onClick={save} type="button">
            <Save size={16} />
            Save
          </button>
        </div>
      </div>
      {status && <div className="notice info">{status}</div>}
      <div className="attendance-grid">
        {visibleRecords.map((record) => (
          <article className="attendance-row" key={record.student_user_id}>
            <div>
              <strong>{record.name}</strong>
              <p>{record.admission_number || record.class_name}</p>
            </div>
            <div className="status-controls">
              {(["present", "absent", "late", "excused"] as const).map((item) => (
                <button
                  className={record.status === item ? "seg-button active" : "seg-button"}
                  key={item}
                  onClick={() => updateRecord(record.student_user_id, item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AssessmentsOfficeView({
  assessments,
  classes,
  token,
}: {
  assessments: Assessment[];
  classes: ClassRoom[];
  token: string;
}) {
  const [items, setItems] = useState(assessments);
  const [form, setForm] = useState({
    class_id: classes[0]?.id || 0,
    subject: "Mathematics",
    title: "",
    term: "Term 1",
    max_marks: 100,
    due_date: todayDate(),
  });
  const [status, setStatus] = useState("");

  useEffect(() => setItems(assessments), [assessments]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    api
      .createAssessment(token, form)
      .then(() => api.assessments(token))
      .then((next) => {
        setItems(next);
        setStatus("Assessment created");
        setForm((current) => ({ ...current, title: "" }));
      })
      .catch((error) => setStatus(error instanceof ApiError ? error.message : "Unable to create assessment"));
  };

  return (
    <section className="office-layout">
      <section className="table-panel">
        <div className="panel-header">
          <div>
            <h3>Class Assessments</h3>
            <p>{items.length} assessment records</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Class</th>
                <th>Subject</th>
                <th>Submitted</th>
                <th>Average</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    <small>{item.term}</small>
                  </td>
                  <td>{item.class_name || "All"}</td>
                  <td>{item.subject}</td>
                  <td>{item.submitted_count}</td>
                  <td>
                    {item.average_marks}/{item.max_marks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="detail-panel">
        <div className="panel-header">
          <div>
            <h3>New Assessment</h3>
            <p>Teacher or DOS submission</p>
          </div>
          <FilePlus2 size={22} />
        </div>
        <form className="office-form" onSubmit={submit}>
          <label>
            Class
            <select value={form.class_id} onChange={(event) => setForm({ ...form, class_id: Number(event.target.value) })}>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}-{item.section}
                </option>
              ))}
            </select>
          </label>
          <label>
            Subject
            <input value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
          </label>
          <label>
            Title
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label>
            Term
            <input value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value })} />
          </label>
          <label>
            Max marks
            <input
              min={1}
              type="number"
              value={form.max_marks}
              onChange={(event) => setForm({ ...form, max_marks: Number(event.target.value) })}
            />
          </label>
          <label>
            Due date
            <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
          </label>
          {status && <p className="form-note">{status}</p>}
          <button className="tool-button primary" type="submit">
            <Plus size={16} />
            Create
          </button>
        </form>
      </section>
    </section>
  );
}

function RequirementsOfficeView({
  requirements,
  students,
  token,
}: {
  requirements: Requirement[];
  students: StudentRecord[];
  token: string;
}) {
  const [items, setItems] = useState(requirements);
  const [form, setForm] = useState({
    student_user_id: students[0]?.id || 0,
    title: "",
    amount: 0,
    status: "pending",
    due_date: todayDate(),
    notes: "",
  });
  const [status, setStatus] = useState("");

  useEffect(() => setItems(requirements), [requirements]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    api
      .createRequirement(token, form)
      .then(() => api.requirements(token))
      .then((next) => {
        setItems(next);
        setStatus("Requirement saved");
        setForm((current) => ({ ...current, title: "", amount: 0, notes: "" }));
      })
      .catch((error) => setStatus(error instanceof ApiError ? error.message : "Unable to save requirement"));
  };

  return (
    <section className="office-layout">
      <section className="table-panel">
        <div className="panel-header">
          <div>
            <h3>Student Requirements</h3>
            <p>{items.length} records</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Requirement</th>
                <th>Amount</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.student_name}</strong>
                    <small>{item.class_name}</small>
                  </td>
                  <td>{item.title}</td>
                  <td>{formatMoney(item.amount)}</td>
                  <td>{item.due_date || ""}</td>
                  <td>
                    <span className={item.status === "cleared" ? "badge success" : "badge warning"}>{item.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="detail-panel">
        <div className="panel-header">
          <div>
            <h3>Add Requirement</h3>
            <p>Reception or accounts desk</p>
          </div>
          <FileCheck2 size={22} />
        </div>
        <form className="office-form" onSubmit={submit}>
          <label>
            Student
            <select
              value={form.student_user_id}
              onChange={(event) => setForm({ ...form, student_user_id: Number(event.target.value) })}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} {student.admission_number ? `(${student.admission_number})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Requirement
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label>
            Amount
            <input
              min={0}
              type="number"
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })}
            />
          </label>
          <label>
            Status
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="pending">Pending</option>
              <option value="cleared">Cleared</option>
            </select>
          </label>
          <label>
            Due date
            <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
          </label>
          <label>
            Notes
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
          {status && <p className="form-note">{status}</p>}
          <button className="tool-button primary" type="submit">
            <Plus size={16} />
            Save
          </button>
        </form>
      </section>
    </section>
  );
}

function UsersView({ users, roles }: { users: UserSummary[]; roles: Role[] }) {
  const [query, setQuery] = useState("");
  const filteredUsers = users.filter((user) => {
    const text = `${user.name} ${user.email} ${user.phone} ${roleLabels[user.role]}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <section className="table-panel">
      <div className="panel-header">
        <div>
          <h3>Users</h3>
          <p>{filteredUsers.length} records</p>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" />
        </label>
      </div>
      <div className="role-strip">
        {roles.map((role) => (
          <span key={role}>{roleLabels[role]}</span>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{roleLabels[user.role]}</td>
                <td>{user.email}</td>
                <td>{user.phone}</td>
                <td>
                  <span className={user.is_active ? "badge success" : "badge muted"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5}>No matching users</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FinanceOfficeView({
  fees,
  ledger,
  summary,
}: {
  fees: Fee[];
  ledger: FinanceLedgerRow[];
  summary?: FeeDashboard;
}) {
  return (
    <>
      <section className="metric-grid">
        <Metric icon={<CircleDollarSign />} label="Paid" value={formatMoney(summary?.total_paid || 0)} tone="green" />
        <Metric icon={<CircleDollarSign />} label="Due" value={formatMoney(summary?.total_due || 0)} tone="amber" />
        <Metric icon={<AlertCircle />} label="Overdue" value={formatMoney(summary?.total_overdue || 0)} tone="red" />
        <Metric icon={<ReceiptText />} label="Ledgers" value={`${ledger.length || fees.length}`} tone="blue" />
      </section>
      <section className="table-panel">
        <div className="panel-header">
          <div>
            <h3>Student Finance Ledger</h3>
            <p>Fees, requirements and balances</p>
          </div>
          <FileSpreadsheet size={21} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Paid</th>
                <th>Fees Due</th>
                <th>Requirements</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={row.student_user_id}>
                  <td>
                    <strong>{row.student_name}</strong>
                    <small>{row.admission_number}</small>
                  </td>
                  <td>{row.class_name}</td>
                  <td>{formatMoney(row.total_paid)}</td>
                  <td>{formatMoney(row.total_due)}</td>
                  <td>{formatMoney(row.requirements_due)}</td>
                  <td>{formatMoney(row.balance)}</td>
                  <td>
                    <span className={row.balance > 0 ? "badge warning" : "badge success"}>
                      {row.balance > 0 ? "Balance" : "Cleared"}
                    </span>
                  </td>
                </tr>
              ))}
              {ledger.length === 0 &&
                fees.map((fee) => (
                  <tr key={fee.id}>
                    <td>{fee.description}</td>
                    <td>{fee.due_date}</td>
                    <td>{formatMoney(fee.amount)}</td>
                    <td>{fee.status}</td>
                    <td />
                    <td />
                    <td>
                      <span className={fee.status === "paid" ? "badge success" : "badge warning"}>{fee.status}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function AcademicsView({ circulars }: { circulars: Circular[] }) {
  return (
    <section className="content-grid">
      <Announcements circulars={circulars} />
      <ModuleQueue title="Homework" icon={<BookOpen size={20} />} />
    </section>
  );
}

function TransportView({ transport }: { transport?: Transport }) {
  if (!transport) return <EmptyState title="Transport route not configured" />;
  return (
    <section className="detail-panel">
      <div className="panel-header">
        <div>
          <h3>{transport.bus_number}</h3>
          <p>{transport.current_location}</p>
        </div>
        <Bus size={24} />
      </div>
      <div className="route-grid">
        <Detail label="Driver" value={transport.driver_name} />
        <Detail label="Phone" value={transport.driver_phone} />
        <Detail label="Pickup" value={`${transport.pickup_location} at ${transport.pickup_time}`} />
        <Detail label="Dropoff" value={`${transport.dropoff_location} at ${transport.dropoff_time}`} />
      </div>
    </section>
  );
}

function MessagesView({ messages, compact = false }: { messages: Message[]; compact?: boolean }) {
  return (
    <section className={compact ? "list-panel compact-list" : "list-panel"}>
      <div className="panel-header">
        <h3>Messages</h3>
      </div>
      <div className="stack-list">
        {messages.map((message) => (
          <article key={message.id} className="list-row">
            <MessageSquare size={18} />
            <div>
              <strong>{message.subject}</strong>
              <p>{message.from_user}</p>
            </div>
            {!message.is_read && <span className="dot" />}
          </article>
        ))}
        {messages.length === 0 && <EmptyState title="No messages" />}
      </div>
    </section>
  );
}

function Announcements({ circulars }: { circulars: Circular[] }) {
  return (
    <section className="list-panel">
      <div className="panel-header">
        <h3>Announcements</h3>
      </div>
      <div className="stack-list">
        {circulars.map((item) => (
          <article key={item.id} className="announcement-row">
            <CalendarDays size={18} />
            <div>
              <strong>{item.title}</strong>
              <p>{item.content}</p>
              <small>{item.issued_date}</small>
            </div>
          </article>
        ))}
        {circulars.length === 0 && <EmptyState title="No announcements" />}
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "teal" | "amber" | "blue" | "green" | "red";
}) {
  return (
    <article className={`metric ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdminSettingsView({
  theme,
  onThemeChange,
  user,
}: {
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  user: User;
}) {
  const themes: Array<{ id: ThemeName; label: string; description: string; icon: React.ReactNode }> = [
    { id: "light", label: "Light", description: "Bright office default", icon: <Sun size={20} /> },
    { id: "dark", label: "Dark", description: "Low-glare desktop view", icon: <Moon size={20} /> },
    { id: "contrast", label: "Contrast", description: "Sharper text and borders", icon: <Palette size={20} /> },
  ];

  return (
    <section className="settings-layout">
      <section className="detail-panel">
        <div className="panel-header">
          <div>
            <h3>Admin Settings</h3>
            <p>Appearance and portal preferences</p>
          </div>
          <Settings size={22} />
        </div>
        <div className="theme-grid">
          {themes.map((option) => (
            <button
              aria-pressed={theme === option.id}
              className={theme === option.id ? "theme-option active" : "theme-option"}
              key={option.id}
              onClick={() => onThemeChange(option.id)}
              type="button"
            >
              {option.icon}
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="detail-panel">
        <div className="panel-header">
          <div>
            <h3>Portal</h3>
            <p>{portalName}</p>
          </div>
          <MonitorDot size={22} />
        </div>
        <div className="profile-grid">
          <Detail label="Signed in as" value={user.name} />
          <Detail label="Role" value={roleLabels[user.role]} />
          <Detail label="School" value={user.school_name} />
          <Detail label="API" value={api.baseUrl} />
        </div>
      </section>
    </section>
  );
}

function ModuleQueue({ title, icon }: { title: string; icon: React.ReactNode }) {
  const [active, setActive] = useState("Records");

  return (
    <section className="detail-panel">
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          <p>Current cycle</p>
        </div>
        {icon}
      </div>
      <div className="module-grid">
        {["Records", "Reports", "Approvals"].map((item) => (
          <button
            aria-pressed={active === item}
            className={active === item ? "active" : ""}
            key={item}
            onClick={() => setActive(item)}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      <div className="module-result">
        <strong>
          {title} {active}
        </strong>
        <p>{active} view selected. Live records will appear here when this module is connected to the backend.</p>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="loading-grid">
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return <p className="empty-state">{title}</p>;
}

function navIcon(item: string) {
  const icons: Record<string, React.ReactNode> = {
    Overview: <GraduationCap size={18} />,
    Students: <UserRound size={18} />,
    Users: <Users size={18} />,
    Schools: <School size={18} />,
    Academics: <BookOpen size={18} />,
    Attendance: <ClipboardList size={18} />,
    Assessments: <ClipboardCheck size={18} />,
    Finance: <CircleDollarSign size={18} />,
    Requirements: <FileCheck2 size={18} />,
    Library: <Library size={18} />,
    Transport: <Bus size={18} />,
    Messages: <MessageSquare size={18} />,
    Settings: <Settings size={18} />,
  };
  return icons[item] || <ClipboardList size={18} />;
}
