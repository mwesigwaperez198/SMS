from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.report_card import (
    ReportCardApprovalUpdate,
    ReportCardDownloadRead,
    ReportCardRead,
    ReportCardSubmit,
)
from app.services import report_card_service

router = APIRouter(prefix="/report-cards", tags=["report cards"])


@router.post("/submit", response_model=ReportCardRead)
def submit_report_card(
    payload: ReportCardSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.TEACHER, RoleId.ADMIN)),
):
    return report_card_service.submit_report_card(db, payload, current_user)


@router.get("/student/{student_id}", response_model=list[ReportCardRead])
def get_student_report_cards(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT, RoleId.STUDENT)),
):
    return report_card_service.list_student_report_cards(db, student_id, current_user)


@router.post("/{report_card_id}/approve", response_model=ReportCardRead)
def approve_report_card(
    report_card_id: int,
    payload: ReportCardApprovalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return report_card_service.approve_report_card(db, report_card_id, payload, current_user)


@router.post("/{report_card_id}/publish", response_model=ReportCardRead)
def publish_report_card(
    report_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN)),
):
    return report_card_service.publish_report_card(db, report_card_id, current_user)


@router.get("/download/{report_card_id}")
def download_report_card(
    report_card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT, RoleId.STUDENT)),
):
    from fastapi import HTTPException
    from app.models.report_card import ReportCard
    from app.models.student import Student
    from app.models.assessment import Assessment

    rc = db.query(ReportCard).filter(ReportCard.id == report_card_id).first()
    if not rc:
        raise HTTPException(404, "Report card not found")

    student = db.query(Student).filter(Student.id == rc.student_id).first()
    assessments = (
        db.query(Assessment)
        .filter(
            Assessment.student_id == rc.student_id,
            Assessment.academic_year == rc.academic_year,
            Assessment.term == rc.term,
        )
        .all()
    )

    report_lines = [
        "REPORT CARD",
        f"Student: {student.name if student else 'Unknown'}",
        f"Class: {student.class_name if student else 'N/A'}",
        f"Term: {rc.term}",
        f"Academic Year: {rc.academic_year}",
        f"",
        "--- ASSESSMENTS ---",
    ]
    for a in assessments:
        report_lines.append(f"{a.subject} ({a.assessment_type}): {a.score}")

    report_lines.extend([
        f"",
        f"Teacher Remarks: {rc.teacher_remarks or 'N/A'}",
        f"Class Teacher Remarks: {rc.class_teacher_remarks or 'N/A'}",
        f"Head Teacher Remarks: {rc.head_teacher_remarks or 'N/A'}",
        f"Status: {rc.status}",
    ])

    return {
        "report_card_id": rc.id,
        "status": rc.status,
        "content": "\n".join(report_lines),
        "format": "text",
        "student_name": student.name if student else "Unknown",
    }
