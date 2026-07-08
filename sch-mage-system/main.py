from fastapi import FastAPI, Depends, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
import json
import jwt
from typing import List, Optional
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from slowapi.middleware import SlowAPIMiddleware

from database import SessionLocal, create_schema, ensure_database_exists, get_db
from db_models import (
    Attendance as AttendanceModel,
    AuditLog,
    CircularItem,
    FeeInvoice,
    HomeworkItem,
    LeaveRequestItem,
    MessageItem,
    ParentStudent,
    PaymentRecord,
    School,
    StudentProfile,
    TransportRoute,
    User,
    UserRole,
)
from security_utils import create_access_token, decode_token, hash_password, utc_now, utc_now_iso, verify_password
from seed_data import ensure_initial_data
from settings import settings

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

def log_audit(db: Session, user: User | None, action: str, entity: str, entity_id: str | None = None, metadata: dict | None = None):
    log = AuditLog(
        school_id=getattr(user, "school_id", None),
        user_id=getattr(user, "id", None),
        action=action,
        entity=entity,
        entity_id=entity_id,
        metadata_json=json.dumps(metadata) if metadata else None,
    )
    db.add(log)
    db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.db_auto_create:
        ensure_database_exists()
        create_schema()
        with SessionLocal() as db:
            ensure_initial_data(db)
    yield


app = FastAPI(
    title=settings.api_title,
    description=settings.api_description,
    version=settings.api_version,
    debug=settings.debug,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, lambda req, exc: JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"}))

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SlowAPIMiddleware)


# ===================== Models =====================

class LoginRequest(BaseModel):
    phone_or_email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=128)

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    role: str
    school_id: int
    school_name: str
    class_id: int
    class_name: str
    profile_pic: str

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

class RoleResponse(BaseModel):
    roles: List[str]

class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=5, max_length=254)
    phone: str = Field(min_length=3, max_length=40)
    password: str = Field(min_length=8, max_length=128)
    role: str
    school_id: Optional[int] = None

class UserSummary(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    role: str
    school_id: Optional[int] = None
    is_active: bool

class AttendanceRecord(BaseModel):
    id: int
    date: str
    status: str
    subject: str

class AttendanceSummary(BaseModel):
    total_days: int
    present: int
    absent: int
    percentage: float

class Homework(BaseModel):
    id: int
    subject: str
    title: str
    description: str
    due_date: str
    file_url: Optional[str] = None

class Circular(BaseModel):
    id: int
    title: str
    content: str
    issued_date: str
    file_url: Optional[str] = None

class Remark(BaseModel):
    id: int
    type: str
    remark: str
    teacher: str
    date: str

class Event(BaseModel):
    id: int
    title: str
    date: str
    description: str

class Fee(BaseModel):
    id: int
    description: str
    amount: float
    due_date: str
    status: str
    paid_date: Optional[str] = None

class FeeDashboard(BaseModel):
    total_due: float
    total_paid: float
    total_overdue: float

class PaymentInitiate(BaseModel):
    invoice_id: int = Field(gt=0)
    amount: float = Field(gt=0)
    method: str = Field(min_length=2, max_length=32)

class PaymentInitiateResponse(BaseModel):
    payment_id: int
    payment_url: str
    status: str

class PaymentVerify(BaseModel):
    payment_id: int = Field(gt=0)
    transaction_id: str = Field(min_length=3, max_length=128)

class Payment(BaseModel):
    id: int
    invoice_id: int
    amount: float
    method: str
    status: str
    transaction_id: str

class LibraryLoan(BaseModel):
    id: int
    book_title: str
    book_id: str
    issue_date: str
    due_date: str
    returned_date: Optional[str] = None
    fine: float

class Book(BaseModel):
    id: int
    title: str
    author: str
    isbn: str
    available: bool

class Result(BaseModel):
    id: int
    subject: str
    marks: float
    total_marks: float
    grade: str
    term: str

class Message(BaseModel):
    id: int
    from_user: str
    from_role: str
    subject: str
    body: str
    created_at: str
    is_read: bool

class MessageSend(BaseModel):
    to_user_id: int = Field(gt=0)
    subject: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=5000)

class Timetable(BaseModel):
    day: str
    period: int
    subject: str
    teacher: str
    room: Optional[str] = None

class Leave(BaseModel):
    id: int
    from_date: str
    to_date: str
    reason: str
    status: str

class LeaveApply(BaseModel):
    from_date: str = Field(min_length=10, max_length=10)
    to_date: str = Field(min_length=10, max_length=10)
    reason: str = Field(min_length=3, max_length=500)

class Document(BaseModel):
    id: int
    filename: str
    file_url: str
    uploaded_date: str

class GalleryImage(BaseModel):
    id: int
    title: str
    image_url: str
    event_date: str

class Transport(BaseModel):
    route_id: int
    bus_number: str
    driver_name: str
    driver_phone: str
    pickup_location: str
    pickup_time: str
    dropoff_location: str
    dropoff_time: str
    current_location: Optional[str] = None
    latitude: float
    longitude: float

class BusLocation(BaseModel):
    bus_id: int
    latitude: float
    longitude: float
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    version: str

# ===================== JWT & Security =====================

security = HTTPBearer(auto_error=False)

def raise_unauthorized(detail: str):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def validate_month(month: str) -> None:
    try:
        datetime.strptime(month, "%Y-%m")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="month must be a valid YYYY-MM value",
        ) from exc


def parse_iso_date(value: str, field_name: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be a valid YYYY-MM-DD value",
        ) from exc


def user_to_response(user: User) -> UserResponse:
    student_profile = user.student_profile
    classroom = student_profile.classroom if student_profile else None
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        school_id=user.school_id or 0,
        school_name=user.school.name if user.school else "Global",
        class_id=classroom.id if classroom else 0,
        class_name=f"{classroom.name}-{classroom.section}" if classroom else "",
        profile_pic=(student_profile.profile_pic if student_profile else None) or "",
    )


def user_to_summary(user: User) -> UserSummary:
    return UserSummary(
        id=user.id,
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        school_id=user.school_id,
        is_active=user.is_active,
    )


def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise_unauthorized("Missing bearer token")

    try:
        payload = decode_token(credentials.credentials)
        user_id = payload.get("user_id") or payload.get("sub")
        if not user_id:
            raise_unauthorized("Invalid token")
        user = db.get(User, int(user_id))
        if not user or not user.is_active:
            raise_unauthorized("Invalid token")
        return user
    except jwt.ExpiredSignatureError:
        raise_unauthorized("Token expired")
    except jwt.InvalidTokenError:
        raise_unauthorized("Invalid token")


def require_roles(*roles: UserRole):
    allowed = {role.value for role in roles}

    def dependency(current_user: User = Depends(verify_token)) -> User:
        if current_user.role == UserRole.super_admin.value:
            return current_user
        if current_user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role permissions")
        return current_user

    return dependency


def current_student_user(current_user: User, db: Session) -> User:
    if current_user.role == UserRole.student.value:
        return current_user
    if current_user.role == UserRole.parent.value:
        link = db.execute(
            select(ParentStudent).where(ParentStudent.parent_user_id == current_user.id).limit(1)
        ).scalar_one_or_none()
        if link:
            student = db.get(User, link.student_user_id)
            if student:
                return student
    return current_user

# ===================== Endpoints =====================

@app.post("/api/v1/auth/login", response_model=AuthResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    identifier = body.phone_or_email.strip().lower()
    user = db.execute(
        select(User).where((func.lower(User.email) == identifier) | (User.phone == body.phone_or_email.strip()))
    ).scalar_one_or_none()

    if user and user.locked_until and user.locked_until > utc_now():
        raise HTTPException(
            status_code=429,
            detail=f"Account locked due to too many failed attempts. Try again in {LOCKOUT_MINUTES} minutes.",
        )

    if not user or not user.is_active or not verify_password(body.password, user.password_hash):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                user.locked_until = utc_now() + timedelta(minutes=LOCKOUT_MINUTES)
            db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = utc_now()
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.school_id, user.role)
    log_audit(db, user, "login", "auth", str(user.id))
    return AuthResponse(token=token, user=user_to_response(user))


@app.get("/api/v1/auth/me", response_model=UserResponse)
def get_current_profile(current_user: User = Depends(verify_token)):
    return user_to_response(current_user)


@app.get("/api/v1/roles", response_model=RoleResponse)
def get_roles(current_user: User = Depends(require_roles(UserRole.school_admin, UserRole.principal))):
    return RoleResponse(roles=[role.value for role in UserRole])


@app.get("/api/v1/admin/users", response_model=List[UserSummary])
def list_users(
    role: Optional[str] = None,
    current_user: User = Depends(require_roles(UserRole.school_admin, UserRole.principal, UserRole.receptionist)),
    db: Session = Depends(get_db),
):
    query = select(User).order_by(User.created_at.desc())
    if current_user.role != UserRole.super_admin.value:
        query = query.where(User.school_id == current_user.school_id)
    if role:
        query = query.where(User.role == role)
    return [user_to_summary(user) for user in db.execute(query.limit(200)).scalars().all()]


@app.post("/api/v1/admin/users", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
def create_user(
    request: UserCreate,
    current_user: User = Depends(require_roles(UserRole.school_admin, UserRole.principal)),
    db: Session = Depends(get_db),
):
    try:
        requested_role = UserRole(request.role)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role") from exc

    if requested_role == UserRole.super_admin and current_user.role != UserRole.super_admin.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only super admins can create super admins")

    school_id = request.school_id if current_user.role == UserRole.super_admin.value else current_user.school_id
    existing = db.execute(
        select(User).where((func.lower(User.email) == request.email.lower()) | (User.phone == request.phone))
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with email or phone already exists")

    user = User(
        school_id=school_id,
        name=request.name,
        email=request.email.lower(),
        phone=request.phone,
        password_hash=hash_password(request.password),
        role=requested_role.value,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit(db, current_user, "create_user", "user", str(user.id), {"role": user.role})
    return user_to_summary(user)

@app.get("/api/v1/student/me", response_model=UserResponse)
def get_student_profile(current_user: User = Depends(verify_token), db: Session = Depends(get_db)):
    return user_to_response(current_student_user(current_user, db))

@app.get("/api/v1/attendance", response_model=List[AttendanceRecord])
def get_attendance(
    month: str = Query("2025-09", min_length=7, max_length=7),
    current_user: User = Depends(verify_token),
    db: Session = Depends(get_db),
):
    validate_month(month)
    student = current_student_user(current_user, db)
    year, month_number = [int(part) for part in month.split("-")]
    start_date = date(year, month_number, 1)
    end_date = date(year + 1, 1, 1) if month_number == 12 else date(year, month_number + 1, 1)
    records = db.execute(
        select(AttendanceModel)
        .where(
            AttendanceModel.student_user_id == student.id,
            AttendanceModel.date >= start_date,
            AttendanceModel.date < end_date,
        )
        .order_by(AttendanceModel.date.asc())
    ).scalars().all()
    return [
        AttendanceRecord(id=record.id, date=record.date.isoformat(), status=record.status, subject=record.subject)
        for record in records
    ]

@app.get("/api/v1/attendance/summary", response_model=AttendanceSummary)
def get_attendance_summary(current_user: User = Depends(verify_token), db: Session = Depends(get_db)):
    student = current_student_user(current_user, db)
    total_days = db.execute(
        select(func.count(AttendanceModel.id)).where(AttendanceModel.student_user_id == student.id)
    ).scalar_one()
    present = db.execute(
        select(func.count(AttendanceModel.id)).where(
            AttendanceModel.student_user_id == student.id,
            AttendanceModel.status == "present",
        )
    ).scalar_one()
    absent = db.execute(
        select(func.count(AttendanceModel.id)).where(
            AttendanceModel.student_user_id == student.id,
            AttendanceModel.status == "absent",
        )
    ).scalar_one()
    percentage = round((present / total_days) * 100, 2) if total_days else 0.0
    return AttendanceSummary(
        total_days=total_days,
        present=present,
        absent=absent,
        percentage=percentage
    )

@app.get("/api/v1/homework", response_model=List[Homework])
def get_homework(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    current_user: User = Depends(verify_token),
    db: Session = Depends(get_db),
):
    query = select(HomeworkItem)
    if current_user.school_id:
        query = query.where(HomeworkItem.school_id == current_user.school_id)
    if current_user.role == UserRole.student.value and current_user.student_profile:
        query = query.where(HomeworkItem.class_id == current_user.student_profile.class_id)
    if date_from:
        query = query.where(HomeworkItem.due_date >= parse_iso_date(date_from, "date_from"))
    if date_to:
        query = query.where(HomeworkItem.due_date <= parse_iso_date(date_to, "date_to"))
    rows = db.execute(query.order_by(HomeworkItem.due_date.asc()).limit(100)).scalars().all()
    return [
        Homework(
            id=row.id,
            subject=row.subject,
            title=row.title,
            description=row.description,
            due_date=row.due_date.isoformat(),
            file_url=row.file_url,
        )
        for row in rows
    ]

@app.get("/api/v1/circulars", response_model=List[Circular])
def get_circulars(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(verify_token),
    db: Session = Depends(get_db),
):
    query = select(CircularItem)
    if current_user.school_id:
        query = query.where(CircularItem.school_id == current_user.school_id)
    rows = db.execute(query.order_by(CircularItem.issued_date.desc()).limit(limit)).scalars().all()
    return [
        Circular(
            id=row.id,
            title=row.title,
            content=row.content,
            issued_date=row.issued_date.isoformat(),
            file_url=row.file_url,
        )
        for row in rows
    ]

@app.get("/api/v1/remarks", response_model=List[Remark])
def get_remarks(current_user = Depends(verify_token)):
    return [
        Remark(
            id=1,
            type="academic",
            remark="Excellent performance in Mathematics. Keep it up!",
            teacher="Mrs. Sharma",
            date="2025-09-18"
        ),
        Remark(
            id=2,
            type="behavior",
            remark="Good participation in class discussions",
            teacher="Mr. Kumar",
            date="2025-09-19"
        ),
        Remark(
            id=3,
            type="attendance",
            remark="Perfect attendance this month",
            teacher="Class Teacher",
            date="2025-09-20"
        )
    ]

@app.get("/api/v1/calendar", response_model=List[Event])
def get_calendar(
    month: str = Query("2025-09", min_length=7, max_length=7),
    current_user = Depends(verify_token),
):
    validate_month(month)
    return [
        Event(id=1, title="Teachers' Day", date="2025-09-05", description="Celebration for teachers"),
        Event(id=2, title="Sports Day", date="2025-09-20", description="Annual sports competition"),
        Event(id=3, title="School Picnic", date="2025-09-28", description="Okhla Bird Sanctuary"),
        Event(id=4, title="Science Fair", date="2025-10-05", description="Student science projects")
    ]

@app.get("/api/v1/fees/invoices", response_model=List[Fee])
def get_fee_invoices(current_user: User = Depends(verify_token), db: Session = Depends(get_db)):
    student = current_student_user(current_user, db)
    rows = db.execute(
        select(FeeInvoice).where(FeeInvoice.student_user_id == student.id).order_by(FeeInvoice.due_date.desc())
    ).scalars().all()
    return [
        Fee(
            id=row.id,
            description=row.description,
            amount=row.amount,
            due_date=row.due_date.isoformat(),
            status=row.status,
            paid_date=row.paid_date.isoformat() if row.paid_date else None,
        )
        for row in rows
    ]

@app.get("/api/v1/fees/dashboard", response_model=FeeDashboard)
def get_fee_dashboard(current_user: User = Depends(verify_token), db: Session = Depends(get_db)):
    student = current_student_user(current_user, db)
    rows = db.execute(select(FeeInvoice).where(FeeInvoice.student_user_id == student.id)).scalars().all()
    total_paid = sum(row.amount for row in rows if row.status == "paid")
    total_due = sum(row.amount for row in rows if row.status != "paid")
    today = date.today()
    total_overdue = sum(row.amount for row in rows if row.status != "paid" and row.due_date < today)
    return FeeDashboard(
        total_due=total_due,
        total_paid=total_paid,
        total_overdue=total_overdue
    )

@app.post("/api/v1/payments/initiate", response_model=PaymentInitiateResponse)
def initiate_payment(
    request: PaymentInitiate,
    current_user: User = Depends(verify_token),
    db: Session = Depends(get_db),
):
    invoice = db.get(FeeInvoice, request.invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    student = current_student_user(current_user, db)
    if invoice.student_user_id != student.id and current_user.role not in {
        UserRole.accountant.value,
        UserRole.school_admin.value,
        UserRole.super_admin.value,
    }:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invoice access denied")
    payment = PaymentRecord(
        invoice_id=invoice.id,
        amount=request.amount,
        method=request.method,
        status="pending",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    log_audit(db, current_user, "initiate_payment", "payment", str(payment.id), {"amount": request.amount})
    return PaymentInitiateResponse(
        payment_id=payment.id,
        payment_url=f"{settings.api_url}/payments/{payment.id}/checkout",
        status="pending"
    )

@app.post("/api/v1/payments/verify", response_model=Payment)
def verify_payment(
    request: PaymentVerify,
    current_user: User = Depends(require_roles(UserRole.accountant, UserRole.school_admin)),
    db: Session = Depends(get_db),
):
    payment = db.get(PaymentRecord, request.payment_id)
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    payment.status = "success"
    payment.transaction_id = request.transaction_id
    invoice = db.get(FeeInvoice, payment.invoice_id)
    if invoice:
        invoice.status = "paid"
        invoice.paid_date = date.today()
    db.commit()
    db.refresh(payment)
    log_audit(db, current_user, "verify_payment", "payment", str(payment.id))
    return Payment(
        id=payment.id,
        invoice_id=payment.invoice_id,
        amount=payment.amount,
        method=payment.method,
        status=payment.status,
        transaction_id=payment.transaction_id or "",
    )

@app.get("/api/v1/library/loans", response_model=List[LibraryLoan])
def get_library_loans(current_user = Depends(verify_token)):
    return [
        LibraryLoan(
            id=1,
            book_title="The Autobiography of a Yogi",
            book_id="LB001",
            issue_date="2025-09-10",
            due_date="2025-09-24",
            returned_date=None,
            fine=0.0
        ),
        LibraryLoan(
            id=2,
            book_title="A Brief History of Time",
            book_id="LB002",
            issue_date="2025-08-15",
            due_date="2025-09-15",
            returned_date="2025-09-18",
            fine=30.0
        )
    ]

@app.get("/api/v1/library/search", response_model=List[Book])
def search_library(q: str = Query(""), current_user = Depends(verify_token)):
    all_books = [
        Book(id=1, title="The Autobiography of a Yogi", author="Paramahansa Yogananda", isbn="978-0876120798", available=True),
        Book(id=2, title="A Brief History of Time", author="Stephen Hawking", isbn="978-0553380163", available=False),
        Book(id=3, title="The Complete Sherlock Holmes", author="Arthur Conan Doyle", isbn="978-0486474618", available=True),
    ]
    if q:
        return [b for b in all_books if q.lower() in b.title.lower() or q.lower() in b.author.lower()]
    return all_books

@app.get("/api/v1/results", response_model=List[Result])
def get_results(term: Optional[str] = None, current_user = Depends(verify_token)):
    return [
        Result(id=1, subject="Mathematics", marks=92, total_marks=100, grade="A+", term="Term1"),
        Result(id=2, subject="English", marks=85, total_marks=100, grade="A", term="Term1"),
        Result(id=3, subject="Science", marks=88, total_marks=100, grade="A", term="Term1"),
        Result(id=4, subject="History", marks=90, total_marks=100, grade="A+", term="Term1"),
        Result(id=5, subject="Hindi", marks=87, total_marks=100, grade="A", term="Term1"),
    ]

@app.get("/api/v1/messages/inbox", response_model=List[Message])
def get_messages(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(verify_token),
    db: Session = Depends(get_db),
):
    rows = db.execute(
        select(MessageItem).where(MessageItem.to_user_id == current_user.id).order_by(MessageItem.created_at.desc()).limit(limit)
    ).scalars().all()
    messages = []
    for row in rows:
        sender = db.get(User, row.from_user_id)
        messages.append(
            Message(
                id=row.id,
                from_user=sender.name if sender else "System",
                from_role=sender.role if sender else "system",
                subject=row.subject,
                body=row.body,
                created_at=row.created_at.isoformat().replace("+00:00", "Z"),
                is_read=row.is_read,
            )
        )
    return messages

@app.post("/api/v1/messages/send", response_model=Message)
def send_message(
    request: MessageSend,
    current_user: User = Depends(verify_token),
    db: Session = Depends(get_db),
):
    recipient = db.get(User, request.to_user_id)
    if not recipient or not recipient.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipient not found")
    if current_user.role != UserRole.super_admin.value and recipient.school_id != current_user.school_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipient is outside your school")
    message = MessageItem(
        school_id=current_user.school_id or recipient.school_id,
        from_user_id=current_user.id,
        to_user_id=recipient.id,
        subject=request.subject,
        body=request.body,
        is_read=False,
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    log_audit(db, current_user, "send_message", "message", str(message.id))
    return Message(
        id=message.id,
        from_user=current_user.name,
        from_role=current_user.role,
        subject=request.subject,
        body=request.body,
        created_at=message.created_at.isoformat().replace("+00:00", "Z"),
        is_read=False
    )

@app.get("/api/v1/timetable", response_model=List[Timetable])
def get_timetable(current_user = Depends(verify_token)):
    return [
        Timetable(day="Monday", period=1, subject="Mathematics", teacher="Mrs. Sharma", room="101"),
        Timetable(day="Monday", period=2, subject="English", teacher="Mr. Kumar", room="102"),
        Timetable(day="Monday", period=3, subject="Science", teacher="Dr. Patel", room="103"),
        Timetable(day="Monday", period=4, subject="History", teacher="Mrs. Gupta", room="104"),
        Timetable(day="Tuesday", period=1, subject="Hindi", teacher="Mr. Singh", room="101"),
        Timetable(day="Tuesday", period=2, subject="Physical Education", teacher="Coach Raj", room="Gym"),
    ]

@app.post("/api/v1/leave/apply", response_model=Leave)
def apply_leave(
    request: LeaveApply,
    current_user: User = Depends(verify_token),
    db: Session = Depends(get_db),
):
    if not current_user.school_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Leave requires a school user")
    leave = LeaveRequestItem(
        school_id=current_user.school_id,
        user_id=current_user.id,
        from_date=parse_iso_date(request.from_date, "from_date"),
        to_date=parse_iso_date(request.to_date, "to_date"),
        reason=request.reason,
        status="pending",
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)
    log_audit(db, current_user, "apply_leave", "leave", str(leave.id))
    return Leave(
        id=leave.id,
        from_date=leave.from_date.isoformat(),
        to_date=leave.to_date.isoformat(),
        reason=leave.reason,
        status=leave.status
    )

@app.get("/api/v1/leave/status", response_model=List[Leave])
def get_leave_status(current_user: User = Depends(verify_token), db: Session = Depends(get_db)):
    rows = db.execute(
        select(LeaveRequestItem)
        .where(LeaveRequestItem.user_id == current_user.id)
        .order_by(LeaveRequestItem.created_at.desc())
    ).scalars().all()
    return [
        Leave(
            id=row.id,
            from_date=row.from_date.isoformat(),
            to_date=row.to_date.isoformat(),
            reason=row.reason,
            status=row.status,
        )
        for row in rows
    ]

@app.get("/api/v1/downloads", response_model=List[Document])
def get_downloads(type: Optional[str] = None, current_user = Depends(verify_token)):
    return [
        Document(id=1, filename="Mathematics_Syllabus_Class_X.pdf", file_url="https://example.com/math_syllabus.pdf", uploaded_date="2025-09-01"),
        Document(id=2, filename="English_Study_Notes.pdf", file_url="https://example.com/english_notes.pdf", uploaded_date="2025-09-05"),
        Document(id=3, filename="Science_Past_Papers.zip", file_url="https://example.com/science_papers.zip", uploaded_date="2025-09-10"),
    ]

@app.get("/api/v1/announcements", response_model=List[Circular])
def get_announcements(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(verify_token),
    db: Session = Depends(get_db),
):
    return get_circulars(limit=limit, current_user=current_user, db=db)

@app.get("/api/v1/gallery", response_model=List[GalleryImage])
def get_gallery(current_user = Depends(verify_token)):
    return [
        GalleryImage(id=1, title="Sports Day 2024", image_url="https://via.placeholder.com/300", event_date="2024-09-20"),
        GalleryImage(id=2, title="Science Fair 2024", image_url="https://via.placeholder.com/300", event_date="2024-10-05"),
        GalleryImage(id=3, title="Cultural Program 2024", image_url="https://via.placeholder.com/300", event_date="2024-11-15"),
    ]

@app.get("/api/v1/transport/route", response_model=Transport)
def get_transport_route(current_user: User = Depends(verify_token), db: Session = Depends(get_db)):
    query = select(TransportRoute)
    if current_user.school_id:
        query = query.where(TransportRoute.school_id == current_user.school_id)
    route = db.execute(query.order_by(TransportRoute.id.asc()).limit(1)).scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transport route not configured")
    return Transport(
        route_id=route.id,
        bus_number=route.bus_number,
        driver_name=route.driver_name,
        driver_phone=route.driver_phone,
        pickup_location=route.pickup_location,
        pickup_time=route.pickup_time,
        dropoff_location=route.dropoff_location,
        dropoff_time=route.dropoff_time,
        current_location=route.current_location,
        latitude=route.latitude,
        longitude=route.longitude,
    )

@app.get("/api/v1/transport/live-tracking", response_model=BusLocation)
def get_bus_location(current_user: User = Depends(verify_token), db: Session = Depends(get_db)):
    query = select(TransportRoute)
    if current_user.school_id:
        query = query.where(TransportRoute.school_id == current_user.school_id)
    route = db.execute(query.order_by(TransportRoute.id.asc()).limit(1)).scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transport route not configured")
    return BusLocation(
        bus_id=route.id,
        latitude=route.latitude,
        longitude=route.longitude,
        timestamp=utc_now_iso()
    )

@app.get("/api/v1/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok", version=settings.api_version)


@app.get("/api/v1/ready", response_model=HealthResponse)
def readiness_check(db: Session = Depends(get_db)):
    db.execute(select(1))
    return HealthResponse(status="ready", version=settings.api_version)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
