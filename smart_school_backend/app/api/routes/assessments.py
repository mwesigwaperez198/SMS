from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import role_required
from app.core.roles import RoleId
from app.db.session import get_db
from app.models.user import User
from app.schemas.assessment import AssessmentBulkCreate, AssessmentCreate
from app.services import assessment_service

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.post("/submit")
def submit_assessment(
    payload: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.TEACHER, RoleId.ADMIN)),
):
    return assessment_service.submit_assessment(db, payload, current_user)


@router.post("/bulk")
def submit_bulk_assessments(
    payload: AssessmentBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.TEACHER, RoleId.ADMIN)),
):
    return assessment_service.submit_bulk_assessments(db, payload, current_user)


@router.get("/student/{student_id}")
def view_student_assessments(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.ADMIN, RoleId.PARENT, RoleId.STUDENT)),
):
    return assessment_service.get_student_assessments(db, student_id, current_user)


@router.get("/class/{class_name}")
def view_class_assessments(
    class_name: str,
    academic_year: str | None = Query(None),
    term: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(role_required(RoleId.TEACHER, RoleId.ADMIN)),
):
    return assessment_service.get_class_assessments(db, class_name, academic_year, term, current_user)
