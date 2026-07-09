export interface NovaraAdmin {
  id: number;
  email: string;
  name: string;
}

export interface Session {
  token: string;
  admin: NovaraAdmin;
}

export interface School {
  id: number;
  tenant_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  timezone: string;
  status: "active" | "suspended" | "expired" | "archived" | "pending";
  plan_id: number;
  plan_name: string;
  subscription_expires: string;
  api_keys_count: number;
  total_users: number;
  total_students: number;
  last_active: string;
  created_at: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  price_ugx: number;
  max_schools: number | null;
  max_students: number | null;
  rate_limit: number;
  features: Record<string, boolean>;
  is_active: boolean;
}

export interface ApiKey {
  id: number;
  school_id: number;
  key_prefix: string;
  key_display: string;
  scopes: string[];
  rate_limit: number;
  status: "active" | "revoked" | "expired";
  last_used_at: string | null;
  last_used_ip: string | null;
  created_at: string;
}

export interface HealthCheck {
  service_name: string;
  status: "ok" | "degraded" | "down";
  latency_ms: number;
  checked_at: string;
}

export interface AuditEntry {
  id: number;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: number | null;
  school_name: string | null;
  metadata: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface Payment {
  id: number;
  school_name: string;
  amount_ugx: number;
  method: string;
  gateway_ref: string;
  status: "pending" | "completed" | "failed" | "refunded";
  created_at: string;
}

export interface Incident {
  id: number;
  school_name: string;
  title: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
  assigned_to: string | null;
  created_at: string;
}

export interface DashboardStats {
  total_schools: number;
  active_schools: number;
  pending_payments: number;
  open_incidents: number;
  api_calls_24h: number;
  total_revenue_ugx: number;
  system_health_score: number;
  recent_events: {
    type: string;
    message: string;
    time: string;
  }[];
}
