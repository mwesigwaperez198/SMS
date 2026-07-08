from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.roles import RoleId
from app.models.assessment import Assessment
from app.models.student import Student
from app.models.user import User
from app.schemas.assessment import AssessmentBulkCreate, AssessmentCreate
from app.services.access_service import ensure_student_access, get_student_in_school
from app.services.audit_service import log_action


def _compute_grade(score: Decimal) -> str:
    n = float(score)
    if n >= 80:
        return "D1"
    if n >= 70:
        return "D2"
    if n >= 65:
        return "C3"
    if n >= 60:
        return "C4"
    if n >= 55:
        return "C5"
    if n >= 50:
        return "C6"
    if n >= 45:
        return "P7"
    if n >= 40:
        return "P8"
    return "F9"


def _assessment_to_read(assessment: Assessment) -> dict:
    data = {
        "id": assessment.id,
        "student_id": assessment.student_id,
        "student_name": assessment.student.name if assessment.student else None,
        "academic_year": assessment.academic_year,
        "term": assessment.term,
        "subject": assessment.subject,
        "assessment_type": assessment.assessment_type,
        "score": assessment.score,
        "grade": _compute_grade(assessment.score),
        "remarks": assessment.remarks,
        "created_at": assessment.created_at,
    }
    return data


def submit_assessment(
    db: Session,
    payload: AssessmentCreate,
    current_user: User,
) -> dict:
    student = get_student_in_school(db, payload.student_id, current_user.school_id)
    existing = (
        db.query(Assessment)
        .filter(
            Assessment.student_id == student.id,
            Assessment.academic_year == payload.academic_year,
            Assessment.term == payload.term,
            Assessment.subject == payload.subject,
            Assessment.assessment_type == payload.assessment_type,
        )
        .first()
    )
    if existing:
        before = {
            "score": str(existing.score),
            "remarks": existing.remarks,
        }
        existing.score = payload.score
        existing.remarks = payload.remarks
        existing.teacher_id = current_user.id
        log_action(
            db,
            current_user=current_user,
            action="assessment.updated",
            entity_type="assessment",
            entity_id=existing.id,
            before_data=before,
            after_data={
                "score": str(existing.score),
                "remarks": existing.remarks,
            },
        )
        db.commit()
        db.refresh(existing)
        return _assessment_to_read(existing)

    assessment = Assessment(
        student_id=student.id,
        school_id=student.school_id,
        academic_year=payload.academic_year,
        term=payload.term,
        subject=payload.subject,
        assessment_type=payload.assessment_type,
        score=payload.score,
        teacher_id=current_user.id,
        remarks=payload.remarks,
    )
    db.add(assessment)
    db.flush()
    log_action(
        db,
        current_user=current_user,
        action="assessment.created",
        entity_type="assessment",
        entity_id=assessment.id,
        after_data={
            "student_id": student.id,
            "assessment_type": payload.assessment_type,
            "score": str(payload.score),
        },
    )
    db.commit()
    db.refresh(assessment)
    return _assessment_to_read(assessment)


def submit_bulk_assessments(
    db: Session,
    payload: AssessmentBulkCreate,
    current_user: User,
) -> list[dict]:
    results = []
    for entry in payload.records:
        result = submit_assessment(db, entry, current_user)
        results.append(result)
    return results


def get_student_assessments(
    db: Session,
    student_id: int,
    current_user: User,
) -> list[dict]:
    student = ensure_student_access(db, student_id, current_user)
    assessments = (
        db.query(Assessment)
        .filter(
            Assessment.student_id == student.id,
            Assessment.school_id == student.school_id,
        )
        .order_by(Assessment.academic_year.desc(), Assessment.term.desc(), Assessment.subject.asc(), Assessment.assessment_type.asc())
        .all()
    )
    return [_assessment_to_read(a) for a in assessments]


def get_class_assessments(
    db: Session,
    class_name: str,
    academic_year: str | None,
    term: str | None,
    current_user: User,
) -> list[dict]:
    query = (
        db.query(Assessment)
        .join(Student, Assessment.student_id == Student.id)
        .filter(
            Assessment.school_id == current_user.school_id,
            Student.class_name == class_name,
        )
    )
    if academic_year:
        query = query.filter(Assessment.academic_year == academic_year)
    if term:
        query = query.filter(Assessment.term == term)
    assessments = (
        query.order_by(Student.name.asc(), Assessment.subject.asc(), Assessment.assessment_type.asc())
        .all()
    )
    return [_assessment_to_read(a) for a in assessments]
