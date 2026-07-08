# Novara Platform — Subscription & Licensing Engine

**Platform Owner:** Novara Tech Africa  
**Target Market:** Uganda & East Africa  
**Supported Institution Tiers:** Kindergarten · Nursery · Primary · Secondary (O & A-Level) · Tertiary · University

---

## 1. Subscription Tiers

| Plan | Max Students | Max Staff | Price (UGX/term) | Features |
|------|-------------|-----------|-----------------|----------|
| **Starter** | 200 | 20 | 150,000 | Fees, Attendance, Report Cards, Parent SMS |
| **Growth** | 800 | 80 | 400,000 | Starter + Library, Digital Report Cards, Bulk SMS |
| **Professional** | 2,500 | 250 | 900,000 | Growth + Analytics, Export (PDF/Excel), Mobile App |
| **Enterprise** | Unlimited | Unlimited | Custom | All features + dedicated onboarding + SLA support |

Plans are stored in the `subscription_plans` database table and managed exclusively by the Super Admin through the platform control panel.

---

## 2. Tenant Onboarding Lifecycle

### Step 1 — Super Admin Provisions School
The Super Admin accesses the platform control panel at `/platform/schools` (POST) and submits:
- School name, address, phone, email
- School code (unique slug, e.g. `KCSS-2025`)
- Education tier (Primary / Secondary / University)
- Subscription plan assignment
- Initial Admin name and email

The system:
1. Creates a `School` record with `subscription_status = "trial"`.
2. Creates a `school_settings` and `school_branding` record.
3. Creates the school's Admin (`role_id = 2`) user account.
4. Generates a **cryptographic Product Key** tied to that school's UUID.
5. Creates a `school_subscriptions` record with status `"trial"` valid for 14 days.
6. Dispatches the key via the configured channel (SMS via Twilio / Email via SendGrid).

### Step 2 — Key Dispatch
The platform checks the tenant's preferred notification channel:
- **SMS** — Twilio API sends the key to the admin's phone number.
- **Email** — SendGrid dispatches a branded activation email with the key and a direct activation link.
- Keys are single-use and expire after **72 hours** if unused.

### Step 3 — Admin Activates Account
The school administrator visits the activation portal at `/activate`:
1. Enters their email and the product key received.
2. The system validates: key is unused, not expired, and belongs to the matching school.
3. On success: `subscription_status` transitions to `"active"`, admin password is set, and login session is created.
4. The product key is marked `used_at = NOW()` and becomes permanently invalid.

### Step 4 — Active School Operation
Once active, the school operates under its assigned subscription plan. The system enforces:
- Student count limits per plan.
- Feature flag checks per module (library, analytics, exports).
- Term-based renewal reminders sent 14 days and 3 days before expiry.

### Step 5 — Renewal
- The Bursar or Admin initiates renewal from the school's billing panel.
- Supported payment methods: MTN Mobile Money, Airtel Money, bank transfer reference.
- Super Admin confirms payment and extends the `expires_at` date on the active subscription record.
- Automated expiry suspension occurs 3 days after `expires_at` if unpaid.

---

## 3. Product Key Generation Specification

### Algorithm
```
KEY_PAYLOAD = school_uuid + plan_id + creation_timestamp_utc
HMAC_DIGEST = HMAC-SHA256(KEY_PAYLOAD, PLATFORM_SECRET_KEY)
FORMATTED_KEY = BASE32_ENCODE(HMAC_DIGEST[:20]).upper()
SEGMENTED_KEY = "-".join([FORMATTED_KEY[i:i+5] for i in range(0, 20, 5)])
```

**Example output:** `NVRA3-K7P2X-M9WQZ-ABCDE`

### Storage
Keys are stored in the `product_keys` table:
```
product_keys
├── id (PK)
├── school_id (FK → schools.id)
├── key_hash (SHA-256 of raw key, indexed unique)
├── plan_id (FK → subscription_plans.id)
├── generated_by_id (FK → users.id — must be super_admin)
├── is_used (BOOLEAN, default FALSE)
├── used_at (TIMESTAMPTZ, nullable)
├── used_by_id (FK → users.id, nullable)
├── expires_at (TIMESTAMPTZ — 72h after generation)
└── created_at (TIMESTAMPTZ)
```

**Security rules:**
- The raw key is **never stored**. Only `SHA-256(key)` is persisted.
- Key validation compares `SHA-256(submitted_key)` against stored `key_hash`.
- Maximum 3 validation attempts per IP per hour (rate-limited at the API gateway).
- All key generation and usage events are written to `audit_logs`.

---

## 4. Super Admin Override Capabilities

The Super Admin (`role_id = 1`) has direct override access to:

| Action | Endpoint | Notes |
|--------|----------|-------|
| Provision school | `POST /platform/schools` | Creates school + admin + product key |
| Regenerate key | `POST /platform/schools/{id}/keys` | Invalidates previous unused keys |
| Manually activate school | `PATCH /platform/schools/{id}/status` | Bypasses key flow for demo/test tenants |
| Upgrade plan | `PATCH /platform/subscriptions/{id}/plan` | Immediate effect, prorated invoice generated |
| Suspend school | `PATCH /platform/schools/{id}/status` body `{"status": "suspended"}` | All school users lose access instantly |
| Reinstate school | `PATCH /platform/schools/{id}/status` body `{"status": "active"}` | Restores access |
| View all subscriptions | `GET /platform/subscriptions` | Paginated, filterable by status and plan |
| View financial summary | `GET /platform/analytics/revenue` | Revenue by plan, period, region |

All override actions are logged to `audit_logs` with `actor_user_id = super_admin.id`.

---

## 5. Subscription State Machine

```
                    ┌─────────────┐
                    │    trial    │ ← initial state on provisioning
                    └──────┬──────┘
                           │ key activated + payment confirmed
                           ▼
                    ┌─────────────┐
         ┌──────── │   active    │ ────────┐
         │          └──────┬──────┘         │
         │                 │ expires_at      │ super admin
         │                 │ passes unpaid   │ override
         │                 ▼                 │
         │          ┌─────────────┐         │
         │          │   expired   │ ────────┤
         │          └──────┬──────┘         │
         │                 │ 3+ days         │
         │                 ▼                 │
         │          ┌─────────────┐         │
         └────────→ │  suspended  │ ←───────┘
                    └──────┬──────┘
                           │ super admin
                           │ explicitly closes
                           ▼
                    ┌─────────────┐
                    │  cancelled  │ (terminal — data retained 90 days)
                    └─────────────┘
```

---

## 6. Notification Templates (Activation Flow)

### SMS (Twilio)
```
Your Novara activation key for [SCHOOL_NAME] is:

[KEY_SEGMENT_1]-[KEY_SEGMENT_2]-[KEY_SEGMENT_3]-[KEY_SEGMENT_4]

Valid for 72 hours. Visit: https://app.novara.ug/activate
Do not share this key.
```

### Email (SendGrid)
- Subject: `Activate your Novara school account — [SCHOOL_NAME]`
- Body includes branded HTML template with key displayed prominently, a one-click activation button, support contact, and "Powered by Novara" footer.

---

## 7. Feature Flag Matrix by Plan

| Feature | Starter | Growth | Professional | Enterprise |
|---------|---------|--------|-------------|-----------|
| Fees & Invoices | ✓ | ✓ | ✓ | ✓ |
| Attendance | ✓ | ✓ | ✓ | ✓ |
| Report Cards (basic) | ✓ | ✓ | ✓ | ✓ |
| Parent SMS | ✓ | ✓ | ✓ | ✓ |
| Digital Library | — | ✓ | ✓ | ✓ |
| Bulk SMS composer | — | ✓ | ✓ | ✓ |
| PDF/Excel Export | — | — | ✓ | ✓ |
| Analytics & Predictions | — | — | ✓ | ✓ |
| Mobile App (offline sync) | — | — | ✓ | ✓ |
| Custom branding | — | — | — | ✓ |
| Dedicated support SLA | — | — | — | ✓ |
| API access | — | — | — | ✓ |

Feature flags are enforced at the API middleware layer using `school_subscriptions.plan_id → subscription_plans.features (JSONB)`.

---

## 8. Revenue Architecture

Novara earns per-term subscription fees from each active school tenant. The financial model:

- **Primary revenue:** Term-based SaaS subscriptions billed per school.
- **Transaction revenue (future):** 0.5% processing fee on mobile money payments processed through Novara's integrated payment gateway.
- **Add-ons (future):** Extra SMS bundles, custom domain branding, data export tokens.

All revenue is tracked in `platform_invoices` (Super Admin view only) and exportable as Excel/PDF from the Super Admin financial analytics panel.

---

*This document is internal to Novara Tech Africa. Last updated: 2026.*
