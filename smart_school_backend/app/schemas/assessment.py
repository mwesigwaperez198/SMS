from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class AssessmentCreate(BaseModel):
    student_id: int
    academic_year: str = Field(min_length=4, max_length=20)
    term: str = Field(min_length=1, max_length=20)
    subject: str = Field(min_length=2, max_length=100)
    assessment_type: str = Field(pattern="^(BOT|MOT|EOT)$")
    score: Decimal = Field(ge=0, le=100)
    remarks: str | None = None


class AssessmentBulkCreate(BaseModel):
    records: list[AssessmentCreate] = Field(min_length=1)


class AssessmentRead(BaseModel):
    id: int
    student_id: int
    student_name: str | None = None
    academic_year: str
    term: str
    subject: str
    assessment_type: str
    score: Decimal
    grade: str | None = None
    remarks: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
