export type User = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  school_id: number;
  school_name: string;
  class_id: number;
  class_name: string;
  profile_pic: string;
};

export type Role =
  | "super_admin"
  | "school_admin"
  | "principal"
  | "teacher"
  | "dos"
  | "student"
  | "parent"
  | "accountant"
  | "librarian"
  | "transport_manager"
  | "receptionist";

export type AttendanceRecord = {
  id: number;
  date: string;
  status: string;
  subject: string;
};

export type Fee = {
  id: number;
  description: string;
  amount: number;
  due_date: string;
  status: string;
  paid_date?: string | null;
};

export type FeeDashboard = {
  total_due: number;
  total_paid: number;
  total_overdue: number;
};

export type Circular = {
  id: number;
  title: string;
  content: string;
  issued_date: string;
  file_url?: string | null;
};

export type Message = {
  id: number;
  from_user: string;
  from_role: string;
  subject: string;
  body: string;
  created_at: string;
  is_read: boolean;
};

export type UserSummary = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  school_id?: number | null;
  is_active: boolean;
};

export type StaffSummary = {
  students: number;
  teachers: number;
  parents: number;
  staff: number;
  fees_paid: number;
  fees_due: number;
  fees_overdue: number;
  attendance_present_today: number;
  attendance_absent_today: number;
};

export type ClassRoom = {
  id: number;
  name: string;
  section: string;
  grade_level?: string | null;
  teacher_name: string;
  student_count: number;
};

export type StudentRecord = {
  id: number;
  name: string;
  email: string;
  phone: string;
  school_id?: number | null;
  is_active: boolean;
  admission_number: string;
  roll_number: string;
  gender: string;
  profile_pic: string;
  class_id?: number | null;
  class_name: string;
  parent_name: string;
  parent_phone: string;
  fees_due: number;
  fees_paid: number;
  requirements_due: number;
  attendance_percentage: number;
};

export type ClassAttendanceRecord = {
  student_user_id: number;
  name: string;
  admission_number: string;
  class_name: string;
  attendance_id?: number | null;
  date: string;
  subject: string;
  status: "present" | "absent" | "late" | "excused" | "unmarked";
};

export type Assessment = {
  id: number;
  school_id: number;
  class_id?: number | null;
  class_name: string;
  teacher_name: string;
  subject: string;
  title: string;
  term: string;
  max_marks: number;
  due_date?: string | null;
  submitted_count: number;
  average_marks: number;
};

export type Requirement = {
  id: number;
  student_user_id: number;
  student_name: string;
  admission_number: string;
  class_name: string;
  title: string;
  amount: number;
  status: string;
  due_date?: string | null;
  notes: string;
};

export type FinanceLedgerRow = {
  student_user_id: number;
  student_name: string;
  admission_number: string;
  class_name: string;
  total_paid: number;
  total_due: number;
  overdue: number;
  requirements_due: number;
  balance: number;
};

export type Transport = {
  route_id: number;
  bus_number: string;
  driver_name: string;
  driver_phone: string;
  pickup_location: string;
  pickup_time: string;
  dropoff_location: string;
  dropoff_time: string;
  current_location?: string | null;
  latitude: number;
  longitude: number;
};

export const runtimeConfig = window.NovaAdminConfig || window.__NOVAADMIN_CONFIG__ || {};
const API_BASE_URL = (runtimeConfig.apiBaseUrl || import.meta.env.VITE_API_BASE_URL || "https://novaadmin.kesug.com").replace(
  /\/+$/,
  "",
);
const REQUEST_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await response.json() : null;

    if (!response.ok) {
      const detail = body?.detail || response.statusText || "Request failed";
      throw new ApiError(response.status, Array.isArray(detail) ? "Validation failed" : detail);
    }

    if (!body) {
      throw new ApiError(
        response.status,
        "The API did not return JSON. Check config.js and make sure it points to the FastAPI backend, not the htdocs site.",
      );
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(0, "The API did not respond. Start the backend or update config.js with the correct API URL.");
    }
    throw new ApiError(0, "Could not reach the API. Check the backend URL in config.js and CORS settings.");
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export const api = {
  baseUrl: API_BASE_URL,
  login: (phone_or_email: string, password: string) =>
    request<{ token: string; user: User }>("/api/v1/auth/login", undefined, {
      method: "POST",
      body: JSON.stringify({ phone_or_email, password }),
    }),
  me: (token: string) => request<User>("/api/v1/auth/me", token),
  ready: () => request<{ status: string; version: string }>("/api/v1/ready"),
  roles: (token: string) => request<{ roles: Role[] }>("/api/v1/roles", token),
  users: (token: string) => request<UserSummary[]>("/api/v1/admin/users", token),
  staffSummary: (token: string) => request<StaffSummary>("/api/v1/admin/summary", token),
  classes: (token: string) => request<ClassRoom[]>("/api/v1/admin/classes", token),
  students: (token: string, classId?: number, query?: string) => {
    const params = new URLSearchParams();
    if (classId) params.set("class_id", String(classId));
    if (query) params.set("q", query);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<StudentRecord[]>(`/api/v1/admin/students${suffix}`, token);
  },
  classAttendance: (token: string, classId: number | undefined, date: string, subject: string) => {
    const params = new URLSearchParams({ date, subject });
    if (classId) params.set("class_id", String(classId));
    return request<ClassAttendanceRecord[]>(`/api/v1/admin/class-attendance?${params.toString()}`, token);
  },
  saveClassAttendance: (
    token: string,
    payload: { date: string; subject: string; records: Array<{ student_user_id: number; status: string }> },
  ) =>
    request<{ status: string; saved: number }>("/api/v1/admin/class-attendance", token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  assessments: (token: string, classId?: number) =>
    request<Assessment[]>(`/api/v1/admin/assessments${classId ? `?class_id=${classId}` : ""}`, token),
  createAssessment: (
    token: string,
    payload: { class_id?: number; subject: string; title: string; term: string; max_marks: number; due_date?: string },
  ) =>
    request<{ status: string; id: number }>("/api/v1/admin/assessments", token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  saveAssessmentScores: (
    token: string,
    payload: { assessment_id: number; scores: Array<{ student_user_id: number; marks: number; remarks?: string }> },
  ) =>
    request<{ status: string; saved: number }>("/api/v1/admin/assessment-scores", token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  requirements: (token: string, studentUserId?: number) =>
    request<Requirement[]>(
      `/api/v1/admin/requirements${studentUserId ? `?student_user_id=${studentUserId}` : ""}`,
      token,
    ),
  createRequirement: (
    token: string,
    payload: { student_user_id: number; title: string; amount: number; status: string; due_date?: string; notes?: string },
  ) =>
    request<{ status: string; id: number }>("/api/v1/admin/requirements", token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  financeLedger: (token: string) => request<FinanceLedgerRow[]>("/api/v1/admin/finance/ledger", token),
  attendance: (token: string, month: string) => request<AttendanceRecord[]>(`/api/v1/attendance?month=${month}`, token),
  fees: (token: string) => request<Fee[]>("/api/v1/fees/invoices", token),
  feeDashboard: (token: string) => request<FeeDashboard>("/api/v1/fees/dashboard", token),
  circulars: (token: string) => request<Circular[]>("/api/v1/circulars", token),
  messages: (token: string) => request<Message[]>("/api/v1/messages/inbox", token),
  transport: (token: string) => request<Transport>("/api/v1/transport/route", token),
};
