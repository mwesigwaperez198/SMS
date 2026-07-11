from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import verify_api_key
from app.models.school import School

router = APIRouter(prefix="/api-auth", tags=["api-key-auth"])


class SchoolInfoResponse(BaseModel):
    school_id: int
    school_name: str
    school_code: str
    subscription_status: str


@router.get("/school-info", response_model=SchoolInfoResponse)
def get_school_info(school: School = Depends(verify_api_key)) -> SchoolInfoResponse:
    """
    Test endpoint — send X-API-Key header with a novara_ key.
    Returns the school context the key is scoped to.
    """
    return SchoolInfoResponse(
        school_id=school.id,
        school_name=school.name,
        school_code=school.school_code,
        subscription_status=school.subscription_status,
    )
