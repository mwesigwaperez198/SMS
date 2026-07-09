# NOVARA System Control Web — Architecture & Implementation Plan

## 1. Overview

The NOVARA Admin Web is a **system-level control panel** (not a school dashboard). It manages every school instance that connects to the Smart School Management System (SMS). The goal: **self-service subscription + API key provisioning for schools, full health surveillance, remote diagnostics, and incident response — all from one web interface.**

---

## 2. Subscription & Billing Flow

### 2.1 Plans

| Plan       | Price (UGX/mo) | Schools | Students | API Rate Limit | Features |
|------------|----------------|---------|----------|----------------|----------|
| Free       | 0              | 1       | 50       | 100 req/min    | Core modules, community support |
| Starter    | 50,000         | 1       | 300      | 500 req/min    | + SMS, email reports |
| Growth     | 150,000        | 3       | 1,000    | 2,000 req/min  | + Library, parent portal |
| Enterprise | 500,000        | ∞       | ∞        | 10,000 req/min | + Custom modules, SLA, dedicated support |

### 2.2 Registration → Payment → Provisioning Pipeline

```
School fills Register School form (name, email, phone, selects plan)
        │
        ▼
System creates pending school record (status=unpaid)
        │
        ▼
System sends payment prompt (MTN/Airtel Mobile Money, card via Flutterwave/Paystack)
        │
        ▼
School enters USSD PIN / card details on the pop-up
        │
        ▼
Payment gateway callback (webhook) ──── on failure → school notified, retry
        │
        ▼ (success)
System verifies payment, activates subscription
        │
        ▼
System generates:
  • API Key + Secret (hashed, stored)
  • School subdomain / tenant ID
  • Default admin credentials (emailed to school)
        │
        ▼
System provisions school database (multi-tenant schema or row-level isolation)
        │
        ▼
School appears in NOVARA Admin Web dashboard (status=active)
        │
        ▼
Welcome email sent with API key, secret, and getting-started guide
```

### 2.3 Payment Gateways (Planned)

| Gateway     | Region        | Method              | Webhook Support |
|-------------|---------------|---------------------|-----------------|
| Flutterwave | Africa-wide   | Cards, Mobile Money | ✅              |
| Paystack    | Africa-wide   | Cards, Mobile Money | ✅              |
| MTN MoMo    | Uganda        | USSD Push / API     | ✅              |
| Airtel Money| Uganda        | USSD Push / API     | ✅              |
| Stripe      | Global        | Cards               | ✅              |

### 2.4 Subscription Lifecycle

```
Active (paid)
  │
  ├── Renewal (auto-debit or manual re-up)
  │     └── Success → extend expiry
  │     └── Fail → grace period (7 days) → downgrade to Free → suspend (30 days) → archive
  │
  ├── Upgrade
  │     └── Pro-rate difference, update rate limits, notify
  │
  └── Cancel
        └── End of billing period → suspend → archive after 90 days
```

---

## 3. API Key Management

### 3.1 Key Structure

```
Key:     novara_{tenant_id}_{base64_random}
Secret:  (bcrypt-hashed, never stored in plaintext)
Scopes:  [read, write, admin] per module
```

### 3.2 Key Operations (from NOVARA Admin Web)

| Action        | Description |
|---------------|-------------|
| Generate      | Creates new key pair, emails to school admin |
| Regenerate    | Invalidates old key, issues new one (logs event) |
| Revoke        | Immediately blocks the key, notifies school |
| List          | Shows all keys per school with last-used timestamp |
| Rate-limit    | Adjust per-key or per-plan throttle (sliding window) |

### 3.3 Key Usage Analytics

```
Dashboard per key:
  • Requests / hour (chart)
  • Endpoints hit
  • Error rate (4xx/5xx breakdown)
  • Avg response time
  • Last used IP addresses
```

---

## 4. NOVARA Admin Web — Module Breakdown

### 4.1 Dashboard (Home)

- **Global Health Score** (0–100%) — composite of all connected schools
- **Live Counters**: active schools, pending payments, open incidents, API calls/sec
- **Recent Events** feed: new registrations, payments, anomalies, support tickets
- **Map View** (optional): geo-location of connected schools

### 4.2 Manual School Addition (by NOVARA Staff)

For schools that cannot self-register (offline onboarding, enterprise clients, or internal deployments):

```
NOVARA Admin navigates to /schools/add

  Step 1 — Basic Info:
    • School name, email, phone, physical address, country
    • Assigned tenant ID (auto-generated, editable)
    • Timezone, locale

  Step 2 — Subscription:
    • Select plan (Free / Starter / Growth / Enterprise)
    • Set custom start & expiry dates (manual override)
    • Mark as "prepaid" or "invoice-based"

  Step 3 — Admin Account:
    • Create the school's first admin user
    • Auto-generate or set a custom password
    • Option: send credentials via email

  Step 4 — Provisioning:
    • Click "Provision School"
    • System creates: school record, subscription, admin user,
      database tenant (or row-level isolation), API keys
    • School appears immediately in /schools list (status=active)

  Review & Save:
    • Summary before final submit
    • Audit log entry: "admin@novara added school 'St. Mary's' (manual)"
```

### 4.4 Schools Module

```
/schools — Table with:
  • Tenant ID, Name, Email, Phone
  • Plan, Status (active/expired/suspended/archived)
  • Subscription expiry
  • API key usage (mini sparkline)
  • Last active timestamp
  • Actions: [View, Edit, Suspend, Impersonate (audit), Delete]

/schools/:id — Detail page:
  • Profile information
  • Subscription & payment history
  • API keys table (masked secret, status, last used)
  • System logs (every API request: timestamp, endpoint, IP, user agent)
  • Incident history
  • Live diagnostic tools:
    - Ping school database
    - Check API responsiveness
    - View recent error logs
    - Clear cache (Redis flush)
    - Reset school admin password (audit-logged)
    - Force sync indices
    - Re-run failed provisioning
    - Toggle maintenance mode (503 with custom message)
```

### 4.3 Subscriptions & Payments

```
/subscriptions — All active/pending/cancelled subscriptions
  • Filter by plan, status, payment method
  • Export to CSV

/payments — Payment ledger
  • Transaction ID, school, amount, method, status, timestamp
  • Refund button (audit-logged)
```

### 4.5 System Health

```
/health — Real-time monitoring:

  ┌─────────────────────────────────────────────┐
  │  Service         Status    Latency   Uptime │
  │─────────────────────────────────────────────│
  │  API Gateway     ● OK      12ms      99.97% │
  │  Auth Service    ● OK      8ms       99.99% │
  │  Database (PG)   ● OK      3ms       100%   │
  │  Redis           ● OK      1ms       100%   │
  │  Queue (Celery)  ● OK      5ms       99.8%  │
  │  Email (SMTP)    ⚠ Slow    340ms     98.2%  │
  │  Face Service    ● OK      45ms      99.5%  │
  └─────────────────────────────────────────────┘

  • Service dependency graph
  • Auto-retry on failure (with manual override)
  • Historical uptime charts (24h, 7d, 30d)
```

### 4.6 Security & IP Intelligence

```
/security — Per-request tracking:

  School "St. Mary's" — Last 24h requests:
  ┌─────────────────┬──────────┬──────────┬──────────┐
  │ IP Address      │ Requests │ Country  │ Flagged  │
  │─────────────────│──────────│──────────│──────────│
  │ 41.210.xxx.xxx  │ 1,234    │ Uganda   │ No       │
  │ 154.120.xxx.xxx │ 89       │ Kenya    │ No       │
  │ 10.0.0.1        │ 12       │ Internal │ No       │
  └─────────────────┴──────────┴──────────┴──────────┘

  • Rate limit breaches (per school, per key)
  • Brute-force attempt alerts (>5 failed auth/min)
  • IP blacklist / whitelist per school
  • Geo-blocking rules per plan
```

### 4.7 Incidents & Support

```
/incidents — Ticketing system:

  ┌──────┬──────────┬──────────────┬──────────┬──────────┐
  │ ID   │ School   │ Issue        │ Severity │ Status   │
  │──────│──────────│──────────────│──────────│──────────│
  │ INC- │ St.      │ DB query     │ Critical │ Resolved │
  │ 042  │ Mary's   │ timeout      │          │          │
  └──────┴──────────┴──────────────┴──────────┴──────────┘

  • Create ticket (manual or auto-detected)
  • Assign to NOVARA staff
  • Link to school logs, IP data, request traces
  • Resolution notes (audited)
```

### 4.8 Remote Diagnostics & Fixes

```
/diagnostics/:school_id — Toolbox:

  ┌──────────────────────────────────────────────┐
  │ 🛠 Diagnostic Tools                          │
  │──────────────────────────────────────────────│
  │ • Test DB connection                         │
  │ • Verify API key validity                    │
  │ • Check Redis cache health                   │
  │ • Run schema migration (dry-run + apply)     │
  │ • Reset rate limit counters                  │
  │ • Re-index search (Elasticsearch)            │
  │ • Flush school cache                         │
  │ • Regenerate school API keys                 │
  │ • Force sync with InfinityFree / Render      │
  │ • Restart background workers                 │
  └──────────────────────────────────────────────┘

  Every action: logged to audit trail with NOVARA admin identity.
```

### 4.10 User Management (Per School)

```
/schools/:id/users — All users belonging to that school:

  ┌──────┬──────────┬────────────┬──────────┬───────────┐
  │ ID   │ Name     │ Role       │ Status   │ Last Seen │
  │──────│──────────│────────────│──────────│───────────│
  │ 42   │ John     │ Admin      │ ● Active │ 2 min ago │
  │ 43   │ Jane     │ Teacher    │ ● Active │ 1 hr ago  │
  │ 44   │ Bob      │ Teacher    │ ○ Disabled│ 3 days ago│
  └──────┴──────────┴────────────┴──────────┴───────────┘

  Actions per user:
    • View profile & activity log
    • Reset password (triggers email to user)
    • Enable / Disable account
    • Change role (with audit)
    • Impersonate (NOVARA logs in AS that user for debugging)
    • Delete (soft, with data retention policy)

  Bulk actions:
    • CSV import / export
    • Role reassignment
    • Mass enable/disable (e.g., end of term)
```

### 4.11 Global vs Per-School Data Organization

The admin web presents data at two levels, always clearly labeled:

```
GLOBAL VIEW (/)

  ┌─ System Overview ───────────────────────────────────┐
  │ Total schools: 47   │ Active: 42   │ Issues: 3     │
  │ Total users: 14,230 │ API calls/s: 1,247           │
  └────────────────────────────────────────────────────┘

  ┌─ All Schools Table ──────────────────────────────────┐
  │ Aggregated view. Click any row to drill into that    │
  │ school's detail. Filter by plan, status, country.    │
  └────────────────────────────────────────────────────┘

PER-SCHOOL VIEW (/schools/:id)

  ┌─ School: St. Mary's College ─────────────────────────┐
  │ Tenant ID: t42 │ Plan: Growth │ Status: ● Active    │
  │ Subscription expires: 2026-12-31                     │
  └────────────────────────────────────────────────────┘

  ┌─ School Health ─────────────────────────────────────┐
  │ API: ● OK (12ms)  │ DB: ● OK (3ms)                 │
  │ Last incident: 14 days ago (resolved)                │
  └────────────────────────────────────────────────────┘

  ┌─ This School's Data ─────────────────────────────────┐
  │ [Users] [Students] [Teachers] [Classes] [Fees]      │
  │ [Library] [Attendance] [Reports] [Request Logs]     │
  │  → Each section shows ONLY this school's records     │
  └────────────────────────────────────────────────────┘
```

**Global reports** roll up metrics from all schools (e.g., total revenue, active student count across system). **School reports** slice to one tenant. NOVARA admins can toggle between views freely.

### 4.12 Alert & Notification Center

```
/alerts — Centralized system-wide alert feed:

  ┌──────────────────────────────────────────────────────────┐
  │ ● Critical  │ SMS Gateway down — all schools affected   │
  │   │         │ 2 min ago                                 │
  │──────────────────────────────────────────────────────────│
  │ ● Warning   │ St. Mary's — 15% rate limit breached      │
  │   │         │ 10 min ago                                 │
  │──────────────────────────────────────────────────────────│
  │ ● Info      │ Nile High — subscription expiring in 7d   │
  │             │ 1 hr ago                                   │
  └──────────────────────────────────────────────────────────┘

  Alert types:
    • System (service down, high latency, DB replication lag)
    • School (rate limit breach, failed payment, unusual IP burst)
    • Security (brute force detected, key compromise suspected)
    • Subscription (expiring soon, expired, payment failed)

  Notification channels:
    • In-app (admin web bell icon)
    • Email to NOVARA staff
    • SMS to on-call NOVARA engineer (critical only)
    • Telegram / Slack webhook (optional)
```

### 4.13 API Playground & Debug Console

```
/debug/api-playground — Interactive API console for testing:

  ┌──────────────────────────────────────────────────────────────┐
  │  Endpoint:  [GET] /api/v1/students ────────── [▼]           │
  │  School:    [St. Mary's ──────────────────────]              │
  │  API Key:   [novara_t42_•••••••••••• restricted]            │
  │                                                              │
  │  Headers:   { "Authorization": "Bearer novara_t42_..." }     │
  │                                                              │
  │  [▶ Send Request]                          [Clear] [Copy]    │
  │                                                              │
  │  Response: 200 OK (142ms)                                    │
  │  {                                                           │
  │    "data": [ { "id": 1, "name": "Alice", ... } ],           │
  │    "meta": { "total": 342, "page": 1 }                      │
  │  }                                                           │
  │                                                              │
  │  Request ID: req_a1b2c3d4                                    │
  └──────────────────────────────────────────────────────────────┘

  • Debug console lets NOVARA admins make live API requests
    as any school to verify endpoints, test fixes, or reproduce bugs
  • Every request is logged to the audit trail
  • Auto-attaches the school's API key (never exposes full secret)
  • Response time, headers, and full body shown
```

### 4.14 Database Explorer (Read-Only)

```
/debug/db/:school_id — Browse school data directly:

  ┌─ Tables ──────────────────────────────────┐
  │ ☑ users (1,234 rows)                      │
  │ ☑ students (890 rows)                     │
  │ ☑ classes (24 rows)                       │
  │ ☑ fees (12,450 rows)                      │
  │ [Run Query]                               │
  └───────────────────────────────────────────┘

  SELECT full_name, email, role_id
  FROM users
  WHERE role_id = 3
  LIMIT 10

  ┌──────────┬─────────────────┬─────────┐
  │ full_name│ email            │ role_id │
  │──────────│─────────────────│─────────│
  │ Jane Doe │ jane@school.com │ 3       │
  └──────────┴─────────────────┴─────────┘

  • Read-only queries only (SELECT, no INSERT/UPDATE/DELETE)
  • Query timeout: 10 seconds max
  • All queries logged: admin, school, SQL text, timestamp
  • Kill long-running queries button
```

---

## 5. Database Schema (New Tables)

```sql
-- ========= Billing & Subscriptions =========
CREATE TABLE subscription_plans (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL,        -- Free, Starter, Growth, Enterprise
    price_ugx   INTEGER NOT NULL,
    max_schools INTEGER,
    max_students INTEGER,
    rate_limit   INTEGER NOT NULL DEFAULT 100,
    features    JSONB,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE school_subscriptions (
    id              SERIAL PRIMARY KEY,
    school_id       INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    plan_id         INTEGER REFERENCES subscription_plans(id),
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, active, expired, suspended, cancelled
    starts_at       TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    auto_renew      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES school_subscriptions(id),
    school_id       INTEGER REFERENCES schools(id),
    amount_ugx      INTEGER NOT NULL,
    currency        VARCHAR(3) DEFAULT 'UGX',
    method          VARCHAR(30),              -- flutterwave, paystack, momo, stripe
    gateway_ref     VARCHAR(255),             -- transaction ID from payment gateway
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, completed, failed, refunded
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ========= API Keys =========
CREATE TABLE api_keys (
    id              SERIAL PRIMARY KEY,
    school_id       INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    key_prefix      VARCHAR(20) NOT NULL,     -- e.g., novara_t42_
    key_hash        VARCHAR(255) NOT NULL,    -- bcrypt of full key
    key_display     VARCHAR(40) NOT NULL,     -- last 4 chars for UI
    scopes          JSONB DEFAULT '["read"]',
    rate_limit      INTEGER,
    status          VARCHAR(20) DEFAULT 'active',  -- active, revoked, expired
    last_used_at    TIMESTAMPTZ,
    last_used_ip    INET,
    created_at      TIMESTAMPTZ DEFAULT now(),
    revoked_at      TIMESTAMPTZ
);

-- ========= Request Logs (per school, per API key) =========
CREATE TABLE api_request_logs (
    id              BIGSERIAL,
    school_id       INTEGER REFERENCES schools(id),
    api_key_id      INTEGER REFERENCES api_keys(id),
    endpoint        VARCHAR(255),
    method          VARCHAR(10),
    status_code     INTEGER,
    ip_address      INET,
    user_agent      TEXT,
    response_time_ms INTEGER,
    created_at      TIMESTAMPTZ DEFAULT now()
) PARTITION BY RANGE (created_at);
-- Partition by month for performance

-- ========= System Health =========
CREATE TABLE health_checks (
    id              SERIAL PRIMARY KEY,
    service_name    VARCHAR(50),              -- api, db, redis, queue, email, face
    status          VARCHAR(20),              -- ok, degraded, down
    latency_ms      INTEGER,
    checked_at      TIMESTAMPTZ DEFAULT now()
);

-- ========= NOVARA Admin Audit =========
CREATE TABLE admin_audit_logs (
    id              SERIAL PRIMARY KEY,
    admin_id        INTEGER REFERENCES novara_admins(id),
    action          VARCHAR(100),             -- e.g., api_key.regenerate, school.suspend
    target_type     VARCHAR(30),              -- school, api_key, subscription
    target_id       INTEGER,
    metadata        JSONB,
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ========= Incidents =========
CREATE TABLE incidents (
    id              SERIAL PRIMARY KEY,
    school_id       INTEGER REFERENCES schools(id),
    title           VARCHAR(200),
    description     TEXT,
    severity        VARCHAR(20) DEFAULT 'info',  -- info, warning, critical
    status          VARCHAR(20) DEFAULT 'open',  -- open, investigating, resolved, closed
    assigned_to     INTEGER REFERENCES novara_admins(id),
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. API Key Authentication Flow (for School Systems)

```
School SMS makes request:
  Authorization: Bearer novara_t42_abc123...xyz

API Gateway:
  1. Extract key prefix → look up school
  2. Hash full key → compare against stored hash
  3. Check:
     • Key not revoked
     • Subscription active (not expired)
     • Rate limit not exceeded (sliding window)
  4. Log request (school_id, endpoint, IP, user agent, timestamp)
  5. Forward to internal service
  6. Return response with X-NOVARA-Request-Id header

Response headers:
  X-NOVARA-Request-Id: req_abc123
  X-NOVARA-RateLimit-Remaining: 423
  X-NOVARA-RateLimit-Reset: 1623456789
```

---

## 7. Implementation Phases

### Phase 1 — Foundation (Week 1–2)

- Subscription plans CRUD (admin-managed, seed data)
- School registration with plan selection
- Payment gateway integration (Flutterwave first)
- Webhook handler → auto-provision school
- API key generation + email delivery

### Phase 2 — Admin Control Web (Week 3–4)

- Schools dashboard (table, detail view)
- API key management UI (generate, revoke, regenerate)
- Subscription & payment history views
- Basic health monitoring (API, DB, Redis)
- Audit trail (admin actions)

### Phase 3 — Advanced Monitoring (Week 5–6)

- Per-school request logs with IP tracking
- Real-time health dashboard with charts
- Rate limit breach alerts
- Incident / ticket system
- Remote diagnostic tools

### Phase 4 — Security & Scale (Week 7–8)

- Geo-blocking & IP blacklist
- Brute-force detection
- Auto-scaling triggers
- SLA monitoring & reporting

---

## 8. Key Principles

| Principle | Why |
|-----------|-----|
| **Self-service first** | Schools register, pay, get keys automatically — zero manual effort for NOVARA |
| **Every action audited** | Immutable log of all admin actions for accountability |
| **Tenant-isolated data** | Schools never see each other's data; NOVARA can see all |
| **Auto-remediation where possible** | Failed payment → grace → downgrade; DB down → auto-restart |
| **Manual override always available** | NOVARA can suspend, fix, or force-provision any school from the web |
| **IP & request intelligence** | Every API call tagged with school + IP for forensic analysis |

---

## 9. Technology Stack (Suggested)

| Component | Option |
|-----------|--------|
| Backend    | FastAPI (already used) |
| Auth       | Bearer tokens + API keys |
| Payments   | Flutterwave (primary), Paystack (backup) |
| Queue      | Celery + Redis (for email, provisioning) |
| Database   | PostgreSQL (partitioned logs) |
| Monitoring | Built-in health checks + Prometheus (stretch) |
| Frontend   | React + Tailwind (already used) |
| Charts     | Recharts / Chart.js |
| Map        | Leaflet (free, no API key) |
| Email      | Resend / SMTP (already configured) |

---

*This document is a living plan. Update as requirements evolve.*
