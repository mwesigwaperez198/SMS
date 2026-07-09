from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.notification import Notification
from app.models.registration import RegistrationKey, RegistrationRequest
from app.models.school import School
from app.models.student import Student
from app.models.subscription import ProductKey, SchoolSubscription, SubscriptionPlan
from app.models.user import User
from app.schemas.subscription import (
    GenerateKeyRequest,
    GenerateKeyResponse,
    SubscriptionPlanCreate,
    SubscriptionPlanRead,
)
from app.services.subscription_service import generate_product_key

router = APIRouter(prefix="/platform", tags=["platform-admin"])


class PlatformStats(BaseModel):
    total_schools: int
    active_schools: int
    total_students: int
    total_users: int
    pending_registrations: int
    active_subscriptions: int
    expired_subscriptions: int
    keys_generated_30d: int


class SchoolAdminRead(BaseModel):
    id: int
    name: str
    school_code: str
    email: str | None
    phone: str | None
    address: str | None
    subscription_status: str
    user_count: int
    student_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SchoolDetail(BaseModel):
    id: int
    name: str
    school_code: str
    email: str | None
    phone: str | None
    address: str | None
    subscription_status: str
    country: str
    admin_name: str | None
    admin_email: str | None
    student_count: int
    user_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RegistrationRequestRead(BaseModel):
    id: int
    school_name: str
    admin_name: str
    admin_email: str
    admin_phone: str
    plan_id: int | None = None
    payment_method: str
    payment_details: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ToggleSchoolStatusRequest(BaseModel):
    status: str = Field(pattern=r"^(active|suspended|trial)$")


class KeyRead(BaseModel):
    id: int
    school_name: str | None
    plan_name: str | None
    is_used: bool
    used_at: datetime | None
    expires_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}


class AuditLogRead(BaseModel):
    id: int
    action: str
    actor_name: str | None
    entity: str | None
    detail: str | None
    ip_address: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/stats", response_model=PlatformStats)
def platform_stats(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> PlatformStats:
    now = datetime.now(timezone.utc)
    return PlatformStats(
        total_schools=db.query(sa_func.count(School.id)).scalar() or 0,
        active_schools=db.query(sa_func.count(School.id)).filter(School.subscription_status == "active").scalar() or 0,
        total_students=db.query(sa_func.count(Student.id)).scalar() or 0,
        total_users=db.query(sa_func.count(User.id)).scalar() or 0,
        pending_registrations=db.query(sa_func.count(RegistrationRequest.id)).filter(RegistrationRequest.status == "pending").scalar() or 0,
        active_subscriptions=db.query(sa_func.count(SchoolSubscription.id)).filter(SchoolSubscription.status == "active").scalar() or 0,
        expired_subscriptions=db.query(sa_func.count(SchoolSubscription.id)).filter(SchoolSubscription.expires_at < now).scalar() or 0,
        keys_generated_30d=db.query(sa_func.count(ProductKey.id)).filter(ProductKey.created_at >= datetime(now.year, now.month - 1 if now.month > 1 else 1, 1, tzinfo=timezone.utc)).scalar() or 0,
    )


@router.get("/schools", response_model=list[SchoolAdminRead])
def list_schools(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
    search: str = Query("", max_length=100),
    status: str = Query("", pattern=r"^(active|suspended|trial|expired|)$"),
) -> list[SchoolAdminRead]:
    q = db.query(School)
    if search:
        q = q.filter(School.name.ilike(f"%{search}%") | School.email.ilike(f"%{search}%") | School.school_code.ilike(f"%{search}%"))
    if status:
        q = q.filter(School.subscription_status == status)
    q = q.order_by(School.created_at.desc())

    results = []
    for school in q.all():
        results.append(SchoolAdminRead(
            id=school.id,
            name=school.name,
            school_code=school.school_code,
            email=school.email,
            phone=school.phone,
            address=school.address,
            subscription_status=school.subscription_status,
            user_count=db.query(sa_func.count(User.id)).filter(User.school_id == school.id).scalar() or 0,
            student_count=db.query(sa_func.count(Student.id)).filter(Student.school_id == school.id).scalar() or 0,
            created_at=school.created_at,
        ))
    return results


@router.get("/schools/{school_id}", response_model=SchoolDetail)
def get_school(
    school_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> SchoolDetail:
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    admin = db.query(User).filter(User.school_id == school_id, User.role_id == RoleId.ADMIN).order_by(User.id).first()
    return SchoolDetail(
        id=school.id,
        name=school.name,
        school_code=school.school_code,
        email=school.email,
        phone=school.phone,
        address=school.address,
        subscription_status=school.subscription_status,
        country=school.country,
        admin_name=admin.name if admin else None,
        admin_email=admin.email if admin else None,
        student_count=db.query(sa_func.count(Student.id)).filter(Student.school_id == school_id).scalar() or 0,
        user_count=db.query(sa_func.count(User.id)).filter(User.school_id == school_id).scalar() or 0,
        created_at=school.created_at,
    )


@router.patch("/schools/{school_id}/status", response_model=dict)
def toggle_school_status(
    school_id: int,
    payload: ToggleSchoolStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> dict:
    school = db.get(School, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    school.subscription_status = payload.status
    db.add(school)
    db.add(AuditLog(
        action="school_status_changed",
        actor_id=current_user.id,
        actor_name=current_user.name,
        entity=f"school:{school_id}",
        detail=f"Status changed to {payload.status}",
    ))
    db.commit()
    return {"detail": f"School {school.name} status set to {payload.status}"}


@router.get("/registrations", response_model=list[RegistrationRequestRead])
def list_registrations(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
    status: str = Query("", pattern=r"^(pending|approved|rejected|)$"),
) -> list[RegistrationRequestRead]:
    q = db.query(RegistrationRequest)
    if status:
        q = q.filter(RegistrationRequest.status == status)
    return q.order_by(RegistrationRequest.created_at.desc()).all()


@router.post("/registrations/{request_id}/approve", response_model=GenerateKeyResponse)
def approve_registration(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> GenerateKeyResponse:
    from app.services.registration_service import generate_registration_key

    req = db.get(RegistrationRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Registration not found")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Registration already processed")

    reg_key = generate_registration_key(db, request_id)
    db.add(AuditLog(
        action="registration_approved",
        actor_id=current_user.id,
        actor_name=current_user.name,
        entity=f"registration:{request_id}",
        detail=f"Approved registration for {req.school_name}",
    ))
    db.commit()

    return GenerateKeyResponse(
        product_key=reg_key.key,
        expires_at=reg_key.created_at,
        message=f"Registration approved. Key sent to {req.admin_email}.",
    )


@router.post("/keys/generate", response_model=GenerateKeyResponse)
def generate_key(
    payload: GenerateKeyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> GenerateKeyResponse:
    raw_key = generate_product_key(db, payload.school_id, payload.plan_id, current_user.id)
    plan = db.get(SubscriptionPlan, payload.plan_id)
    plan_name = plan.name if plan else "Unknown"
    db.add(AuditLog(
        action="key_generated",
        actor_id=current_user.id,
        actor_name=current_user.name,
        entity=f"school:{payload.school_id}",
        detail=f"Generated {plan_name} subscription key",
    ))
    db.commit()
    return GenerateKeyResponse(
        product_key=raw_key,
        expires_at=datetime.now(timezone.utc),
        message=f"Product key generated for {plan_name} plan.",
    )


@router.get("/keys", response_model=list[KeyRead])
def list_keys(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
    school_id: int | None = Query(None),
    used: bool | None = Query(None),
) -> list[KeyRead]:
    q = db.query(ProductKey).options(joinedload(ProductKey.school), joinedload(ProductKey.plan))
    if school_id:
        q = q.filter(ProductKey.school_id == school_id)
    if used is not None:
        q = q.filter(ProductKey.is_used == used)
    q = q.order_by(ProductKey.created_at.desc()).limit(100)
    results = []
    for k in q.all():
        results.append(KeyRead(
            id=k.id,
            school_name=k.school.name if k.school else None,
            plan_name=k.plan.name if k.plan else None,
            is_used=k.is_used,
            used_at=k.used_at,
            expires_at=k.expires_at,
            created_at=k.created_at,
        ))
    return results


@router.get("/plans", response_model=list[SubscriptionPlanRead])
def list_plans(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> list[SubscriptionPlanRead]:
    return db.query(SubscriptionPlan).order_by(SubscriptionPlan.price).all()


@router.post("/plans", response_model=SubscriptionPlanRead)
def create_plan(
    payload: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> SubscriptionPlanRead:
    existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=409, detail="Plan name already exists")
    plan = SubscriptionPlan(**payload.model_dump())
    db.add(plan)
    db.add(AuditLog(
        action="plan_created",
        actor_id=current_user.id,
        actor_name=current_user.name,
        entity=f"plan:{plan.name}",
        detail=f"Created subscription plan {plan.name}",
    ))
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/audit-logs", response_model=list[AuditLogRead])
def list_audit_logs(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
    limit: int = Query(50, le=200),
) -> list[AuditLogRead]:
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()


@router.get("/users", response_model=list[dict])
def list_platform_users(
    db: Session = Depends(get_db),
    _user: User = Depends(role_required(RoleId.SUPER_ADMIN)),
) -> list[dict]:
    users = db.query(User).options(joinedload(User.role), joinedload(User.school)).order_by(User.created_at.desc()).limit(100).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role.name if u.role else None,
            "school": u.school.name if u.school else None,
            "is_active": u.is_active,
            "is_2fa_enabled": u.is_2fa_enabled or False,
            "last_login": u.last_login_at,
            "created_at": u.created_at,
        }
        for u in users
    ]
