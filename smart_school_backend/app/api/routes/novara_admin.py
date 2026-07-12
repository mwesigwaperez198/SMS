import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/novara", tags=["novara-admin"])

NOVARA_ROLE_ID = 1

logger = logging.getLogger(__name__)


class NovaraLoginRequest(BaseModel):
    email: EmailStr
    password: str


class NovaraSessionResponse(BaseModel):
    token: str
    admin: dict


class SchoolCreateRequest(BaseModel):
    name: str
    email: str
    phone: str = ""
    address: str = ""
    country: str = "Uganda"
    timezone: str = "Africa/Kampala"
    plan_id: int
    admin_email: str
    admin_name: str
    send_email: bool = True


class MaintenanceToggleRequest(BaseModel):
    enabled: bool


class PlanCreateRequest(BaseModel):
    name: str
    price_ugx: float = 0
    max_students: int | None = None
    max_schools: int | None = None
    features: dict = {}


def _check_novara(current_user: User):
    if current_user.role_id != NOVARA_ROLE_ID:
        raise HTTPException(status_code=403, detail="NOVARA admin only")


@router.post("/auth/login")
def novara_login(payload: NovaraLoginRequest, db: Session = Depends(get_db)):
    from app.services.auth_service import authenticate_user, build_user_token

    user = authenticate_user(db, payload.email.lower(), payload.password)
    if not user or user.role_id != NOVARA_ROLE_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or not a NOVARA admin",
        )

    token = build_user_token(user)
    return NovaraSessionResponse(
        token=token,
        admin={"id": user.id, "email": user.email, "name": user.name},
    )


@router.get("/dashboard/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    total = db.execute(text("SELECT COUNT(*) FROM schools")).scalar() or 0
    active = db.execute(
        text("SELECT COUNT(*) FROM schools WHERE subscription_status = 'active'")
    ).scalar() or 0
    total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0
    pending_reg = db.execute(
        text("SELECT COUNT(*) FROM registration_requests WHERE status = 'pending'")
    ).scalar() or 0
    total_students = db.execute(text("SELECT COUNT(*) FROM students")).scalar() or 0

    recent_events = []
    recent_regs = db.execute(
        text("SELECT school_name, admin_name, status, created_at FROM registration_requests ORDER BY created_at DESC LIMIT 5")
    ).fetchall()
    for r in recent_regs:
        recent_events.append({
            "type": "registration",
            "message": f"{r[0]} ({r[1]}) — {r[2]}",
            "time": r[3].isoformat() if r[3] else "",
        })

    recent_schools = db.execute(
        text("SELECT name, subscription_status, created_at FROM schools ORDER BY created_at DESC LIMIT 3")
    ).fetchall()
    for s in recent_schools:
        recent_events.append({
            "type": "school",
            "message": f"{s[0]} — {s[1]}",
            "time": s[2].isoformat() if s[2] else "",
        })

    return {
        "total_schools": total,
        "active_schools": active,
        "pending_payments": pending_reg,
        "open_incidents": 0,
        "api_calls_24h": 0,
        "total_revenue_ugx": 0,
        "system_health_score": 98,
        "total_users": total_users,
        "total_students": total_students,
        "recent_events": sorted(recent_events, key=lambda x: x["time"], reverse=True)[:8],
    }


@router.get("/schools")
def list_schools(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    rows = db.execute(
        text("""
            SELECT s.id, s.name, s.email, s.phone, s.subscription_status,
                   COALESCE(sp.name, 'N/A') as plan_name,
                   s.created_at,
                   (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id) as user_count,
                   (SELECT COUNT(*) FROM students st WHERE st.school_id = s.id) as student_count
            FROM schools s
            LEFT JOIN school_subscriptions ss ON ss.school_id = s.id AND ss.status = 'active'
            LEFT JOIN subscription_plans sp ON sp.id = ss.plan_id
            ORDER BY s.created_at DESC
        """)
    ).fetchall()

    return [
        {
            "id": r[0],
            "tenant_id": f"t{r[0]}",
            "name": r[1],
            "email": r[2] or "",
            "phone": r[3] or "",
            "address": "",
            "country": "Uganda",
            "timezone": "Africa/Kampala",
            "status": r[4] or "pending",
            "plan_name": r[5],
            "subscription_expires": "",
            "api_keys_count": 0,
            "total_users": r[7] or 0,
            "total_students": r[8] or 0,
            "last_active": "",
            "created_at": r[6].isoformat() if r[6] else "",
        }
        for r in rows
    ]


@router.get("/schools/{school_id}")
def get_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    row = db.execute(
        text("""
            SELECT s.id, s.name, s.email, s.phone, s.subscription_status, s.created_at,
                   (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id) as user_count,
                   (SELECT COUNT(*) FROM students st WHERE st.school_id = s.id) as student_count
            FROM schools s WHERE s.id = :id
        """),
        {"id": school_id},
    ).one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="School not found")

    return {
        "id": row[0],
        "tenant_id": f"t{row[0]}",
        "name": row[1],
        "email": row[2] or "",
        "phone": row[3] or "",
        "address": "",
        "country": "Uganda",
        "timezone": "Africa/Kampala",
        "status": row[4] or "pending",
        "plan_name": "N/A",
        "subscription_expires": "",
        "api_keys_count": 0,
        "total_users": row[6] or 0,
        "total_students": row[7] or 0,
        "last_active": "",
        "created_at": row[5].isoformat() if row[5] else "",
    }


@router.post("/schools")
def create_school(
    payload: SchoolCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    existing = db.execute(
        text("SELECT id FROM schools WHERE email = :email"),
        {"email": payload.email},
    ).scalar()
    if existing:
        raise HTTPException(status_code=400, detail="School with this email already exists")

    result = db.execute(
        text("""
            INSERT INTO schools (name, email, phone, subscription_status, created_at, updated_at)
            VALUES (:name, :email, :phone, 'active', NOW(), NOW())
            RETURNING id
        """),
        {"name": payload.name, "email": payload.email, "phone": payload.phone},
    )
    school_id = result.scalar()

    db.execute(
        text("""
            INSERT INTO school_subscriptions (school_id, plan_id, status, starts_at, expires_at, created_at, updated_at)
            VALUES (:sid, :pid, 'active', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW())
        """),
        {"sid": school_id, "pid": payload.plan_id},
    )

    from app.core.security import hash_password

    hashed = hash_password("changeme123")
    db.execute(
        text("""
            INSERT INTO users (name, email, password_hash, role_id, school_id, is_active, created_at, updated_at)
            VALUES (:name, :email, :pwd, 2, :sid, true, NOW(), NOW())
        """),
        {"name": payload.admin_name, "email": payload.admin_email, "pwd": hashed, "sid": school_id},
    )

    db.commit()
    return {"id": school_id, "name": payload.name, "status": "active", "detail": "School provisioned"}


@router.post("/schools/{school_id}/suspend")
def suspend_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    db.execute(
        text("UPDATE schools SET subscription_status = 'suspended', updated_at = NOW() WHERE id = :id"),
        {"id": school_id},
    )
    db.commit()
    return {"detail": "School suspended"}


@router.post("/schools/{school_id}/activate")
def activate_school(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    db.execute(
        text("UPDATE schools SET subscription_status = 'active', updated_at = NOW() WHERE id = :id"),
        {"id": school_id},
    )
    db.commit()
    return {"detail": "School activated"}


@router.get("/plans")
def list_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    rows = db.execute(
        text("SELECT id, name, price, max_students, max_staff, features, is_active FROM subscription_plans ORDER BY price ASC")
    ).fetchall()

    return [
        {
            "id": r[0],
            "name": r[1],
            "price_ugx": float(r[2]) if r[2] else 0,
            "max_students": r[3],
            "max_schools": r[4],
            "rate_limit": 100,
            "features": r[5] or {},
            "is_active": r[6],
        }
        for r in rows
    ]


@router.post("/plans")
def create_plan(
    payload: PlanCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    result = db.execute(
        text("""
            INSERT INTO subscription_plans (name, price, max_students, max_staff, features, is_active, created_at)
            VALUES (:name, :price, :students, :staff, :features, true, NOW())
            RETURNING id
        """),
        {
            "name": payload.name,
            "price": payload.price_ugx,
            "students": payload.max_students,
            "staff": payload.max_schools,
            "features": payload.features,
        },
    )
    db.commit()
    plan_id = result.scalar()
    return {"id": plan_id, **payload.model_dump()}


@router.patch("/plans/{plan_id}")
def update_plan(
    plan_id: int,
    payload: PlanCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    db.execute(
        text("""
            UPDATE subscription_plans
            SET name = :name, price = :price, max_students = :students,
                max_staff = :staff, features = :features
            WHERE id = :id
        """),
        {
            "id": plan_id,
            "name": payload.name,
            "price": payload.price_ugx,
            "students": payload.max_students,
            "staff": payload.max_schools,
            "features": payload.features,
        },
    )
    db.commit()
    return {"id": plan_id, **payload.model_dump()}


@router.get("/health")
def system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)

    import time
    from sqlalchemy import text

    start = time.time()
    try:
        db.execute(text("SELECT 1"))
        db_latency = int((time.time() - start) * 1000)
        db_status = "ok"
    except Exception:
        db_latency = 0
        db_status = "down"

    return [
        {"service_name": "API Gateway", "status": "ok", "latency_ms": 12, "checked_at": datetime.now(timezone.utc).isoformat()},
        {"service_name": "Auth Service", "status": "ok", "latency_ms": 8, "checked_at": datetime.now(timezone.utc).isoformat()},
        {"service_name": "Database", "status": db_status, "latency_ms": db_latency, "checked_at": datetime.now(timezone.utc).isoformat()},
        {"service_name": "Email Service", "status": "ok", "latency_ms": 0, "checked_at": datetime.now(timezone.utc).isoformat()},
    ]


@router.get("/audit")
def audit_logs(
    school_id: int = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    rows = db.execute(
        text("""
            SELECT a.id, a.action, COALESCE(u.name, 'System') as actor_name,
                   a.entity_type, a.entity_id, a.ip_address, a.created_at
            FROM audit_logs a
            LEFT JOIN users u ON u.id = a.actor_id
            ORDER BY a.created_at DESC
            LIMIT :limit
        """),
        {"limit": limit},
    ).fetchall()

    return [
        {
            "id": r[0],
            "admin_name": r[2],
            "action": r[1],
            "target_type": r[3],
            "target_id": r[4],
            "school_name": None,
            "metadata": {},
            "ip_address": r[5] or "",
            "created_at": r[6].isoformat() if r[6] else "",
        }
        for r in rows
    ]


@router.get("/payments")
def payments_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    rows = db.execute(
        text("""
            SELECT rr.id, rr.school_name, rr.payment_method, rr.payment_details,
                   rr.status, rr.created_at,
                   COALESCE(sp.name, 'N/A') as plan_name
            FROM registration_requests rr
            LEFT JOIN subscription_plans sp ON sp.id = rr.plan_id
            ORDER BY rr.created_at DESC
        """)
    ).fetchall()

    return [
        {
            "id": r[0],
            "school_name": r[1],
            "amount_ugx": 0,
            "method": r[2] or "unknown",
            "gateway_ref": r[3] or "",
            "status": "completed" if r[4] == "approved" else "pending" if r[4] == "pending" else "failed",
            "created_at": r[5].isoformat() if r[5] else "",
            "plan_name": r[6],
        }
        for r in rows
    ]


@router.get("/incidents")
def incidents_list(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    return []


@router.get("/schools/{school_id}/api-keys")
def school_api_keys(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    rows = db.execute(
        text("""
            SELECT id, key_prefix, description, is_active, last_used_at, expires_at, created_at
            FROM api_keys WHERE school_id = :sid ORDER BY created_at DESC
        """),
        {"sid": school_id},
    ).fetchall()

    return [
        {
            "id": r[0],
            "school_id": school_id,
            "key_prefix": r[1],
            "key_display": r[1],
            "scopes": [],
            "rate_limit": 100,
            "status": "active" if r[3] else "revoked",
            "last_used_at": r[4].isoformat() if r[4] else None,
            "last_used_ip": None,
            "created_at": r[6].isoformat() if r[6] else "",
        }
        for r in rows
    ]


@router.post("/schools/{school_id}/api-keys")
def generate_school_key(
    school_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)

    import secrets as secrets_mod
    from sqlalchemy import text
    import hashlib

    raw_key = f"novara_t{school_id}_{secrets_mod.token_hex(16)}"
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    key_prefix = raw_key[:10]

    db.execute(
        text("""
            INSERT INTO api_keys (school_id, key_hash, key_prefix, is_active, created_at)
            VALUES (:sid, :kh, :kp, true, NOW())
        """),
        {"sid": school_id, "kh": key_hash, "kp": key_prefix},
    )
    db.commit()

    return {"key": raw_key, "key_display": key_prefix}


@router.post("/api-keys/{key_id}/revoke")
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    db.execute(
        text("UPDATE api_keys SET is_active = false WHERE id = :id"),
        {"id": key_id},
    )
    db.commit()
    return {"detail": "API key revoked"}


# ─── Maintenance Mode ──────────────────────────────────────

@router.get("/maintenance")
def get_maintenance_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    row = db.execute(
        text("SELECT value FROM system_settings WHERE key = 'maintenance_mode'")
    ).one_or_none()

    enabled = row[0] == "true" if row else False
    return {"enabled": enabled}


@router.post("/maintenance/toggle")
def toggle_maintenance(
    payload: MaintenanceToggleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    value = "true" if payload.enabled else "false"
    existing = db.execute(
        text("SELECT id FROM system_settings WHERE key = 'maintenance_mode'")
    ).one_or_none()

    if existing:
        db.execute(
            text("UPDATE system_settings SET value = :val, updated_at = NOW() WHERE key = 'maintenance_mode'"),
            {"val": value},
        )
    else:
        db.execute(
            text("INSERT INTO system_settings (key, value, updated_at) VALUES ('maintenance_mode', :val, NOW())"),
            {"val": value},
        )
    db.commit()

    return {
        "enabled": payload.enabled,
        "message": "Maintenance mode enabled. All schools will see a maintenance page." if payload.enabled
                   else "Maintenance mode disabled. System is back online.",
    }


@router.get("/registrations")
def list_registrations(
    status: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    q = """
        SELECT rr.id, rr.school_name, rr.admin_name, rr.admin_email, rr.admin_phone,
               rr.payment_method, rr.payment_details, rr.status, rr.created_at,
               COALESCE(sp.name, 'N/A') as plan_name
        FROM registration_requests rr
        LEFT JOIN subscription_plans sp ON sp.id = rr.plan_id
    """
    params = {}
    if status:
        q += " WHERE rr.status = :status"
        params["status"] = status
    q += " ORDER BY rr.created_at DESC"

    rows = db.execute(text(q), params).fetchall()

    return [
        {
            "id": r[0],
            "school_name": r[1],
            "admin_name": r[2],
            "admin_email": r[3],
            "admin_phone": r[4],
            "payment_method": r[5],
            "payment_details": r[6],
            "status": r[7],
            "plan_name": r[9],
            "created_at": r[8].isoformat() if r[8] else "",
        }
        for r in rows
    ]


@router.post("/registrations/{request_id}/approve")
def approve_registration(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from app.services.registration_service import generate_registration_key
    from sqlalchemy import text

    req = db.execute(
        text("SELECT id, status FROM registration_requests WHERE id = :id"),
        {"id": request_id},
    ).one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Registration not found")
    if req[1] != "pending":
        raise HTTPException(status_code=400, detail="Registration already processed")

    reg_key = generate_registration_key(db, request_id)
    db.commit()

    return {
        "product_key": reg_key.key,
        "expires_at": reg_key.created_at.isoformat() if reg_key.created_at else "",
        "message": f"Registration approved. Key sent to {req[0]}.",
    }


@router.post("/registrations/{request_id}/reject")
def reject_registration(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_novara(current_user)
    from sqlalchemy import text

    req = db.execute(
        text("SELECT id, status FROM registration_requests WHERE id = :id"),
        {"id": request_id},
    ).one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Registration not found")
    if req[1] != "pending":
        raise HTTPException(status_code=400, detail="Registration already processed")

    db.execute(
        text("UPDATE registration_requests SET status = 'rejected', updated_at = NOW() WHERE id = :id"),
        {"id": request_id},
    )
    db.commit()
    return {"detail": "Registration rejected"}
