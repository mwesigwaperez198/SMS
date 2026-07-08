from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    super_admin = "super_admin"
    school_admin = "school_admin"
    principal = "principal"
    teacher = "teacher"
    dos = "dos"
    student = "student"
    parent = "parent"
    accountant = "accountant"
    librarian = "librarian"
    transport_manager = "transport_manager"
    receptionist = "receptionist"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class School(Base, TimestampMixin):
    __tablename__ = "schools"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    code: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    domain: Mapped[str | None] = mapped_column(String(160), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="school")


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        UniqueConstraint("phone", name="uq_users_phone"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    school_id: Mapped[int | None] = mapped_column(ForeignKey("schools.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    school: Mapped[School | None] = relationship(back_populates="users")
    student_profile: Mapped["StudentProfile | None"] = relationship(back_populates="user", uselist=False)
    teacher_profile: Mapped["TeacherProfile | None"] = relationship(back_populates="user", uselist=False)


class ClassRoom(Base, TimestampMixin):
    __tablename__ = "classrooms"
    __table_args__ = (UniqueConstraint("school_id", "name", "section", name="uq_classrooms_school_name_section"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    section: Mapped[str] = mapped_column(String(30), default="", nullable=False)
    grade_level: Mapped[str | None] = mapped_column(String(30), nullable=True)
    teacher_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)


class StudentProfile(Base, TimestampMixin):
    __tablename__ = "student_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    admission_number: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    class_id: Mapped[int | None] = mapped_column(ForeignKey("classrooms.id"), nullable=True)
    roll_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    date_of_birth: Mapped[Date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(30), nullable=True)
    profile_pic: Mapped[str | None] = mapped_column(String(500), nullable=True)

    user: Mapped[User] = relationship(back_populates="student_profile")
    classroom: Mapped[ClassRoom | None] = relationship()


class ParentStudent(Base, TimestampMixin):
    __tablename__ = "parent_students"
    __table_args__ = (UniqueConstraint("parent_user_id", "student_user_id", name="uq_parent_student"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    student_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    relationship: Mapped[str] = mapped_column(String(40), default="guardian", nullable=False)


class TeacherProfile(Base, TimestampMixin):
    __tablename__ = "teacher_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    employee_number: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    designation: Mapped[str | None] = mapped_column(String(120), nullable=True)

    user: Mapped[User] = relationship(back_populates="teacher_profile")


class Attendance(Base, TimestampMixin):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("student_user_id", "date", "subject", name="uq_attendance_student_date_subject"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    date: Mapped[Date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    subject: Mapped[str] = mapped_column(String(120), nullable=False)


class HomeworkItem(Base, TimestampMixin):
    __tablename__ = "homework"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, index=True)
    class_id: Mapped[int | None] = mapped_column(ForeignKey("classrooms.id"), nullable=True, index=True)
    teacher_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    subject: Mapped[str] = mapped_column(String(120), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    due_date: Mapped[Date] = mapped_column(Date, nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class CircularItem(Base, TimestampMixin):
    __tablename__ = "circulars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    issued_date: Mapped[Date] = mapped_column(Date, nullable=False)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class FeeInvoice(Base, TimestampMixin):
    __tablename__ = "fee_invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, index=True)
    student_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(180), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    due_date: Mapped[Date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="pending", nullable=False)
    paid_date: Mapped[Date | None] = mapped_column(Date, nullable=True)


class PaymentRecord(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("fee_invoices.id"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    method: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="pending", nullable=False)
    transaction_id: Mapped[str | None] = mapped_column(String(160), nullable=True)


class MessageItem(Base, TimestampMixin):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    school_id: Mapped[int | None] = mapped_column(ForeignKey("schools.id"), nullable=True, index=True)
    from_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    to_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(180), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class LeaveRequestItem(Base, TimestampMixin):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    from_date: Mapped[Date] = mapped_column(Date, nullable=False)
    to_date: Mapped[Date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="pending", nullable=False)


class TransportRoute(Base, TimestampMixin):
    __tablename__ = "transport_routes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    school_id: Mapped[int] = mapped_column(ForeignKey("schools.id"), nullable=False, index=True)
    bus_number: Mapped[str] = mapped_column(String(80), nullable=False)
    driver_name: Mapped[str] = mapped_column(String(160), nullable=False)
    driver_phone: Mapped[str] = mapped_column(String(40), nullable=False)
    pickup_location: Mapped[str] = mapped_column(String(180), nullable=False)
    pickup_time: Mapped[str] = mapped_column(String(20), nullable=False)
    dropoff_location: Mapped[str] = mapped_column(String(180), nullable=False)
    dropoff_time: Mapped[str] = mapped_column(String(20), nullable=False)
    current_location: Mapped[str | None] = mapped_column(String(180), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)


class AuditLog(Base, TimestampMixin):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    school_id: Mapped[int | None] = mapped_column(ForeignKey("schools.id"), nullable=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
