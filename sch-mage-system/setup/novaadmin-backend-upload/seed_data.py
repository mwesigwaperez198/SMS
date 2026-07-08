from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from db_models import (
    Attendance,
    CircularItem,
    ClassRoom,
    FeeInvoice,
    HomeworkItem,
    MessageItem,
    ParentStudent,
    School,
    StudentProfile,
    TeacherProfile,
    TransportRoute,
    User,
    UserRole,
)
from security_utils import hash_password
from settings import settings


DEMO_PASSWORD = "password123"


def get_or_create_school(db: Session) -> School:
    school = db.execute(select(School).where(School.code == settings.default_school_code)).scalar_one_or_none()
    if school:
        return school

    school = School(
        name=settings.default_school_name,
        code=settings.default_school_code,
        domain=settings.api_domain,
        is_active=True,
    )
    db.add(school)
    db.flush()
    return school


def get_or_create_user(
    db: Session,
    *,
    name: str,
    email: str,
    phone: str,
    role: UserRole,
    password: str,
    school_id: int | None,
    verified: bool = True,
) -> User:
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user:
        return user

    user = User(
        school_id=school_id,
        name=name,
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        role=role.value,
        is_active=True,
        is_verified=verified,
    )
    db.add(user)
    db.flush()
    return user


def ensure_initial_data(db: Session) -> None:
    school = get_or_create_school(db)

    has_super_admin = db.execute(
        select(User.id).where(User.role == UserRole.super_admin.value).limit(1)
    ).first()
    if not has_super_admin:
        if settings.is_production and settings.initial_admin_password == "ChangeMe123!":
            raise RuntimeError("INITIAL_ADMIN_PASSWORD must be set to a unique value before production seeding.")
        get_or_create_user(
            db,
            name=settings.initial_admin_name,
            email=settings.initial_admin_email,
            phone=settings.initial_admin_phone,
            role=UserRole.super_admin,
            password=settings.initial_admin_password or DEMO_PASSWORD,
            school_id=None,
        )

    if settings.seed_demo_data:
        ensure_demo_data(db, school)

    db.commit()


def ensure_demo_data(db: Session, school: School) -> None:
    teacher = get_or_create_user(
        db,
        name="Amina Teacher",
        email="teacher@novaadmin.kesug.com",
        phone="256700000101",
        role=UserRole.teacher,
        password=DEMO_PASSWORD,
        school_id=school.id,
    )
    student = get_or_create_user(
        db,
        name="Jeetendra Sahu",
        email="jeetendra@doon.edu.in",
        phone="9876543210",
        role=UserRole.student,
        password=DEMO_PASSWORD,
        school_id=school.id,
    )
    parent = get_or_create_user(
        db,
        name="Parent Guardian",
        email="parent@novaadmin.kesug.com",
        phone="256700000102",
        role=UserRole.parent,
        password=DEMO_PASSWORD,
        school_id=school.id,
    )

    for role, email, phone, name in [
        (UserRole.school_admin, "schooladmin@novaadmin.kesug.com", "256700000103", "School Admin"),
        (UserRole.principal, "principal@novaadmin.kesug.com", "256700000104", "School Principal"),
        (UserRole.dos, "dos@novaadmin.kesug.com", "256700000109", "Director of Studies"),
        (UserRole.accountant, "accountant@novaadmin.kesug.com", "256700000105", "School Accountant"),
        (UserRole.librarian, "librarian@novaadmin.kesug.com", "256700000106", "School Librarian"),
        (UserRole.transport_manager, "transport@novaadmin.kesug.com", "256700000107", "Transport Manager"),
        (UserRole.receptionist, "reception@novaadmin.kesug.com", "256700000108", "Receptionist"),
    ]:
        get_or_create_user(
            db,
            name=name,
            email=email,
            phone=phone,
            role=role,
            password=DEMO_PASSWORD,
            school_id=school.id,
        )

    classroom = db.execute(
        select(ClassRoom).where(
            ClassRoom.school_id == school.id,
            ClassRoom.name == "X",
            ClassRoom.section == "A",
        )
    ).scalar_one_or_none()
    if not classroom:
        classroom = ClassRoom(
            school_id=school.id,
            name="X",
            section="A",
            grade_level="10",
            teacher_user_id=teacher.id,
        )
        db.add(classroom)
        db.flush()

    if not student.student_profile:
        db.add(
            StudentProfile(
                user_id=student.id,
                admission_number="ADM-0001",
                class_id=classroom.id,
                roll_number="1",
                gender="male",
                profile_pic="https://via.placeholder.com/150",
            )
        )

    if not teacher.teacher_profile:
        db.add(
            TeacherProfile(
                user_id=teacher.id,
                employee_number="EMP-0001",
                designation="Class Teacher",
            )
        )

    has_parent_link = db.execute(
        select(ParentStudent.id).where(
            ParentStudent.parent_user_id == parent.id,
            ParentStudent.student_user_id == student.id,
        )
    ).first()
    if not has_parent_link:
        db.add(ParentStudent(parent_user_id=parent.id, student_user_id=student.id, relationship="guardian"))

    if not db.execute(select(Attendance.id).where(Attendance.student_user_id == student.id).limit(1)).first():
        for day in range(1, 25):
            db.add(
                Attendance(
                    student_user_id=student.id,
                    date=date(2025, 9, day),
                    status=["present", "absent", "late"][day % 3],
                    subject=["Math", "English", "Science", "History"][day % 4],
                )
            )

    if not db.execute(select(HomeworkItem.id).where(HomeworkItem.school_id == school.id).limit(1)).first():
        db.add_all(
            [
                HomeworkItem(
                    school_id=school.id,
                    class_id=classroom.id,
                    teacher_user_id=teacher.id,
                    subject="Mathematics",
                    title="Exercise 5.2 - Quadratic Equations",
                    description="Solve problems 1-20 from the textbook",
                    due_date=date(2025, 9, 25),
                    file_url="https://example.com/math_hw.pdf",
                ),
                HomeworkItem(
                    school_id=school.id,
                    class_id=classroom.id,
                    teacher_user_id=teacher.id,
                    subject="English",
                    title="Essay on Environmental Conservation",
                    description="Write 500 words essay",
                    due_date=date(2025, 9, 26),
                    file_url=None,
                ),
            ]
        )

    if not db.execute(select(CircularItem.id).where(CircularItem.school_id == school.id).limit(1)).first():
        db.add_all(
            [
                CircularItem(
                    school_id=school.id,
                    title="Mid-Term Examination Schedule Released",
                    content="Mid-term exams will start from October 1st.",
                    issued_date=date(2025, 9, 18),
                    file_url="https://example.com/exam_schedule.pdf",
                ),
                CircularItem(
                    school_id=school.id,
                    title="School Closed on 2nd October",
                    content="School will remain closed on October 2nd.",
                    issued_date=date(2025, 9, 20),
                    file_url=None,
                ),
            ]
        )

    if not db.execute(select(FeeInvoice.id).where(FeeInvoice.student_user_id == student.id).limit(1)).first():
        db.add_all(
            [
                FeeInvoice(
                    school_id=school.id,
                    student_user_id=student.id,
                    description="Tuition Fee - Term 1",
                    amount=50000.00,
                    due_date=date(2025, 8, 31),
                    status="paid",
                    paid_date=date(2025, 8, 30),
                ),
                FeeInvoice(
                    school_id=school.id,
                    student_user_id=student.id,
                    description="Activity Fee - Term 1",
                    amount=5000.00,
                    due_date=date(2025, 9, 15),
                    status="pending",
                ),
            ]
        )

    if not db.execute(select(MessageItem.id).where(MessageItem.to_user_id == student.id).limit(1)).first():
        db.add(
            MessageItem(
                school_id=school.id,
                from_user_id=teacher.id,
                to_user_id=student.id,
                subject="Great performance in Math class!",
                body="Your recent exam shows excellent understanding of quadratic equations.",
                is_read=False,
            )
        )

    if not db.execute(select(TransportRoute.id).where(TransportRoute.school_id == school.id).limit(1)).first():
        db.add(
            TransportRoute(
                school_id=school.id,
                bus_number="DIS-2024-05",
                driver_name="Raj Kumar",
                driver_phone="9876543210",
                pickup_location="Gurgaon Gate",
                pickup_time="07:30",
                dropoff_location="School Main Gate",
                dropoff_time="08:15",
                current_location="Sector 12, Gurgaon",
                latitude=28.4595,
                longitude=77.0266,
            )
        )
