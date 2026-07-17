import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.deps import get_current_user, role_required
from app.core.roles import RoleId
from sqlalchemy import text

from app.db.session import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["role-extensions"])


class ChildInfo(BaseModel):
    student_id: int
    student_name: str
    admission_number: str | None
    class_name: str | None
    stream_name: str | None


class TeacherClassInfo(BaseModel):
    class_name: str
    student_count: int
    students: list[dict]


class StudentSelfData(BaseModel):
    student_id: int
    student_name: str
    admission_number: str | None
    class_name: str | None
    school_name: str
    fees: list[dict]
    attendance: list[dict]
    assessments: list[dict]
    report_cards: list[dict]
    notifications: list[dict]


@router.get("/me/student-data", response_model=StudentSelfData)
def get_student_self_data(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user.role_id != RoleId.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")

    student = db.execute(
        text("SELECT s.id, s.name, s.admission_number, s.class_name, s.stream_name, sc.name as school_name "
             "FROM students s JOIN schools sc ON s.school_id = sc.id WHERE s.user_id = :uid"),
        {"uid": current_user.id},
    ).fetchone()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    school_id_result = db.execute(
        text("SELECT school_id FROM students WHERE user_id = :uid"), {"uid": current_user.id}
    ).fetchone()
    school_id = school_id_result[0] if school_id_result else current_user.school_id

    fees = db.execute(
        text("""SELECT i.id, i.amount, i.status, i.due_date, i.description, i.academic_year, i.term,
            fc.name as category_name, COALESCE(SUM(p.amount), 0) as paid_amount
            FROM invoices i
            LEFT JOIN fee_categories fc ON i.fee_category_id = fc.id
            LEFT JOIN payments p ON p.invoice_id = i.id
            WHERE i.student_id = :sid GROUP BY i.id ORDER BY i.id DESC"""),
        {"sid": student.id},
    ).fetchall()

    attendance = db.execute(
        text("""SELECT id, attendance_date, status, remarks FROM attendance
            WHERE student_id = :sid ORDER BY attendance_date DESC LIMIT 30"""),
        {"sid": student.id},
    ).fetchall()

    assessments = db.execute(
        text("""SELECT id, subject, score, assessment_type, academic_year, term, remarks
            FROM assessments WHERE student_id = :sid ORDER BY id DESC LIMIT 50"""),
        {"sid": student.id},
    ).fetchall()

    report_cards = db.execute(
        text("""SELECT id, subject, score, grade, academic_year, term, status, teacher_remarks
            FROM report_cards WHERE student_id = :sid ORDER BY id DESC LIMIT 50"""),
        {"sid": student.id},
    ).fetchall()

    notifications = db.execute(
        text("""SELECT id, title, message, type, status, created_at
            FROM notifications WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20"""),
        {"uid": current_user.id},
    ).fetchall()

    return StudentSelfData(
        student_id=student.id,
        student_name=student.name,
        admission_number=student.admission_number,
        class_name=student.class_name,
        school_name=student.school_name,
        fees=[
            {
                "id": f.id, "amount": f"UGX {f.amount:,.2f}", "status": f.status,
                "due_date": f.due_date.isoformat() if hasattr(f.due_date, "isoformat") else str(f.due_date),
                "description": f.description, "academic_year": f.academic_year, "term": f.term,
                "category_name": f.category_name, "paid_amount": f"UGX {f.paid_amount:,.2f}",
            }
            for f in fees
        ],
        attendance=[
            {
                "id": a.id, "date": a.attendance_date.isoformat() if hasattr(a.attendance_date, "isoformat") else str(a.attendance_date),
                "status": a.status, "remarks": a.remarks,
            }
            for a in attendance
        ],
        assessments=[
            {
                "id": a.id, "subject": a.subject, "score": float(a.score),
                "type": a.assessment_type, "academic_year": a.academic_year,
                "term": a.term, "remarks": a.remarks,
            }
            for a in assessments
        ],
        report_cards=[
            {
                "id": r.id, "subject": r.subject, "score": float(r.score),
                "grade": r.grade, "academic_year": r.academic_year,
                "term": r.term, "status": r.status, "remarks": r.teacher_remarks,
            }
            for r in report_cards
        ],
        notifications=[
            {
                "id": n.id, "title": n.title, "message": n.message,
                "type": n.type, "status": n.status,
                "created_at": n.created_at.isoformat() if n.created_at else "",
            }
            for n in notifications
        ],
    )


@router.get("/me/children", response_model=list[ChildInfo])
def get_parent_children(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user.role_id != RoleId.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")

    children = db.execute(
        text("""SELECT s.id as student_id, s.name as student_name, s.admission_number,
            s.class_name, s.stream_name
            FROM student_guardians sg
            JOIN students s ON sg.student_id = s.id
            WHERE sg.guardian_id = :uid AND s.is_active = true"""),
        {"uid": current_user.id},
    ).fetchall()

    return [
        ChildInfo(
            student_id=c.student_id,
            student_name=c.student_name,
            admission_number=c.admission_number,
            class_name=c.class_name,
            stream_name=c.stream_name,
        )
        for c in children
    ]


@router.get("/me/child/{student_id}/data")
def get_child_data(
    student_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user.role_id != RoleId.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can access this endpoint")

    link = db.execute(
        text("SELECT id FROM student_guardians WHERE student_id = :sid AND guardian_id = :uid"),
        {"sid": student_id, "uid": current_user.id},
    ).fetchone()

    if not link:
        raise HTTPException(status_code=403, detail="Not linked to this student")

    fees = db.execute(
        text("""SELECT i.id, i.amount, i.status, i.due_date, i.description, i.academic_year, i.term,
            fc.name as category_name, COALESCE(SUM(p.amount), 0) as paid_amount
            FROM invoices i
            LEFT JOIN fee_categories fc ON i.fee_category_id = fc.id
            LEFT JOIN payments p ON p.invoice_id = i.id
            WHERE i.student_id = :sid GROUP BY i.id ORDER BY i.id DESC"""),
        {"sid": student_id},
    ).fetchall()

    attendance = db.execute(
        text("""SELECT id, attendance_date, status, remarks FROM attendance
            WHERE student_id = :sid ORDER BY attendance_date DESC LIMIT 30"""),
        {"sid": student_id},
    ).fetchall()

    assessments = db.execute(
        text("""SELECT id, subject, score, assessment_type, academic_year, term, remarks
            FROM assessments WHERE student_id = :sid ORDER BY id DESC LIMIT 50"""),
        {"sid": student_id},
    ).fetchall()

    report_cards = db.execute(
        text("""SELECT id, subject, score, grade, academic_year, term, status, teacher_remarks
            FROM report_cards WHERE student_id = :sid ORDER BY id DESC LIMIT 50"""),
        {"sid": student_id},
    ).fetchall()

    notifications = db.execute(
        text("""SELECT id, title, message, type, status, created_at
            FROM notifications WHERE user_id = :uid ORDER BY created_at DESC LIMIT 20"""),
        {"uid": current_user.id},
    ).fetchall()

    student = db.execute(
        text("SELECT s.id, s.name, s.admission_number, s.class_name, s.stream_name FROM students s WHERE s.id = :sid"),
        {"sid": student_id},
    ).fetchone()

    return {
        "student": {
            "id": student.id, "name": student.name, "admission_number": student.admission_number,
            "class_name": student.class_name, "stream_name": student.stream_name,
        } if student else None,
        "fees": [
            {
                "id": f.id, "amount": f"UGX {f.amount:,.2f}", "status": f.status,
                "due_date": str(f.due_date), "description": f.description,
                "academic_year": f.academic_year, "term": f.term,
                "category_name": f.category_name, "paid_amount": f"UGX {f.paid_amount:,.2f}",
            }
            for f in fees
        ],
        "attendance": [
            {"id": a.id, "date": str(a.attendance_date), "status": a.status, "remarks": a.remarks}
            for a in attendance
        ],
        "assessments": [
            {
                "id": a.id, "subject": a.subject, "score": float(a.score),
                "type": a.assessment_type, "academic_year": a.academic_year,
                "term": a.term, "remarks": a.remarks,
            }
            for a in assessments
        ],
        "report_cards": [
            {
                "id": r.id, "subject": r.subject, "score": float(r.score),
                "grade": r.grade, "academic_year": r.academic_year,
                "term": r.term, "status": r.status, "remarks": r.teacher_remarks,
            }
            for r in report_cards
        ],
        "notifications": [
            {
                "id": n.id, "title": n.title, "message": n.message,
                "type": n.type, "status": n.status,
                "created_at": n.created_at.isoformat() if n.created_at else "",
            }
            for n in notifications
        ],
    }


@router.get("/teacher/classes")
def get_teacher_classes(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user.role_id != RoleId.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")

    classes = db.execute(
        text("""SELECT DISTINCT class_name, COUNT(*) as student_count
            FROM students WHERE school_id = :sid AND is_active = true AND class_name IS NOT NULL
            GROUP BY class_name ORDER BY class_name"""),
        {"sid": current_user.school_id},
    ).fetchall()

    result = []
    for cls in classes:
        students = db.execute(
            text("""SELECT id, name, admission_number, class_name, stream_name
                FROM students WHERE school_id = :sid AND class_name = :cn AND is_active = true
                ORDER BY name"""),
            {"sid": current_user.school_id, "cn": cls.class_name},
        ).fetchall()
        result.append({
            "class_name": cls.class_name,
            "student_count": cls.student_count,
            "students": [
                {"id": s.id, "name": s.name, "admission_number": s.admission_number,
                 "class_name": s.class_name, "stream_name": s.stream_name}
                for s in students
            ],
        })

    return result


@router.get("/ict/system-health")
def get_ict_system_health(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user.role_id not in (RoleId.ICT_ADMIN, RoleId.ADMIN, RoleId.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    school_id = current_user.school_id

    total_users = db.execute(
        text("SELECT COUNT(*) FROM users WHERE school_id = :sid"), {"sid": school_id}
    ).scalar() or 0

    active_users = db.execute(
        text("SELECT COUNT(*) FROM users WHERE school_id = :sid AND is_active = true"), {"sid": school_id}
    ).scalar() or 0

    total_students = db.execute(
        text("SELECT COUNT(*) FROM students WHERE school_id = :sid"), {"sid": school_id}
    ).scalar() or 0

    locked_accounts = db.execute(
        text("SELECT COUNT(*) FROM users WHERE school_id = :sid AND locked_until > NOW()"), {"sid": school_id}
    ).scalar() or 0

    two_fa_enabled = db.execute(
        text("SELECT COUNT(*) FROM users WHERE school_id = :sid AND is_2fa_enabled = true"), {"sid": school_id}
    ).scalar() or 0

    recent_logins = db.execute(
        text("""SELECT COUNT(*) FROM users WHERE school_id = :sid
            AND last_login_at > NOW() - INTERVAL '24 hours'"""), {"sid": school_id}
    ).scalar() or 0

    api_keys_active = db.execute(
        text("SELECT COUNT(*) FROM api_keys WHERE school_id = :sid AND is_active = true"), {"sid": school_id}
    ).scalar() or 0

    db_latency_result = db.execute(text("SELECT 1")).fetchone()
    db_status = "ok" if db_latency_result else "down"

    return {
        "api_server": "ok",
        "database": db_status,
        "total_users": total_users,
        "active_users": active_users,
        "total_students": total_students,
        "locked_accounts": locked_accounts,
        "two_fa_enabled": two_fa_enabled,
        "recent_logins_24h": recent_logins,
        "api_keys_active": api_keys_active,
    }


@router.get("/secretary/guardian-list")
def get_guardian_list(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user.role_id not in (RoleId.SECRETARY, RoleId.ADMIN):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    guardians = db.execute(
        text("""SELECT u.id, u.name, u.email, u.phone,
            s.name as student_name, sg.relationship
            FROM student_guardians sg
            JOIN users u ON sg.guardian_id = u.id
            JOIN students s ON sg.student_id = s.id
            WHERE s.school_id = :sid ORDER BY u.name"""),
        {"sid": current_user.school_id},
    ).fetchall()

    return [
        {
            "id": g.id, "name": g.name, "email": g.email, "phone": g.phone,
            "student_name": g.student_name, "relationship": g.relationship,
        }
        for g in guardians
    ]


@router.get("/librarian/active-borrows")
def get_active_borrows(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user.role_id not in (RoleId.LIBRARIAN, RoleId.ADMIN):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    borrows = db.execute(
        text("""SELECT lb.id, lb.borrowed_at, lb.due_date, lb.returned_at, lb.status,
            lb.notes, lb.created_at,
            lb.book_id, lb.borrower_id, lb.issued_by_id,
            lbk.title as book_title, lbk.author as book_author, lbk.isbn as book_isbn,
            u.name as borrower_name, ib.name as issued_by_name
            FROM library_borrows lb
            JOIN library_books lbk ON lb.book_id = lbk.id
            LEFT JOIN users u ON lb.borrower_id = u.id
            LEFT JOIN users ib ON lb.issued_by_id = ib.id
            WHERE lb.school_id = :sid
            ORDER BY lb.created_at DESC"""),
        {"sid": current_user.school_id},
    ).fetchall()

    return [
        {
            "id": b.id, "book_id": b.book_id, "book_title": b.book_title,
            "book_author": b.book_author, "book_isbn": b.book_isbn,
            "borrower_id": b.borrower_id, "borrower_name": b.borrower_name,
            "issued_by_name": b.issued_by_name,
            "borrowed_at": b.borrowed_at.isoformat() if b.borrowed_at else "",
            "due_date": b.due_date.isoformat() if b.due_date else "",
            "returned_at": b.returned_at.isoformat() if b.returned_at else None,
            "status": b.status, "notes": b.notes,
        }
        for b in borrows
    ]


@router.get("/librarian/overdue")
def get_overdue_books(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    if current_user.role_id not in (RoleId.LIBRARIAN, RoleId.ADMIN):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    overdue = db.execute(
        text("""SELECT lb.id, lb.borrowed_at, lb.due_date,
            lbk.title as book_title, lbk.author as book_author,
            u.name as borrower_name, u.email as borrower_email
            FROM library_borrows lb
            JOIN library_books lbk ON lb.book_id = lbk.id
            LEFT JOIN users u ON lb.borrower_id = u.id
            WHERE lb.school_id = :sid AND lb.status = 'active' AND lb.due_date < NOW()
            ORDER BY lb.due_date ASC"""),
        {"sid": current_user.school_id},
    ).fetchall()

    return [
        {
            "id": o.id, "book_title": o.book_title, "book_author": o.book_author,
            "borrower_name": o.borrower_name, "borrower_email": o.borrower_email,
            "borrowed_at": o.borrowed_at.isoformat() if o.borrowed_at else "",
            "due_date": o.due_date.isoformat() if o.due_date else "",
        }
        for o in overdue
    ]
