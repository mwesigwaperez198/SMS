from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.services.face_service import extract_embedding, verify_face

router = APIRouter(prefix="/api/v1/auth/face", tags=["face-auth"])


class FaceRegisterRequest(BaseModel):
    image_data: str  # base64 data URL


class FaceVerifyRequest(BaseModel):
    image_data: str


@router.post("/register")
def register_face(
    req: FaceRegisterRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if current_user.role_id not in (1, 10):
        raise HTTPException(
            status_code=403,
            detail="Facial recognition is only available for Super Admin and Headteacher roles",
        )
    embedding = extract_embedding(req.image_data)
    if embedding is None:
        raise HTTPException(
            status_code=400,
            detail="Could not detect a face in the image. Ensure good lighting and face is clearly visible.",
        )
    import json

    current_user.face_descriptor = json.dumps(embedding)
    db.commit()
    return {"detail": "Face registered successfully"}


@router.post("/verify")
def verify_face_login(
    req: FaceVerifyRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if not current_user.face_descriptor:
        raise HTTPException(
            status_code=400,
            detail="No face registered. Please register your face first in Profile settings.",
        )
    match = verify_face(req.image_data, current_user.face_descriptor)
    if not match:
        raise HTTPException(
            status_code=401,
            detail="Face verification failed. Please try again with better lighting.",
        )
    return {"detail": "Face verified successfully", "matched": True}


@router.get("/status")
def face_status(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    return {
        "face_registered": bool(current_user.face_descriptor),
        "role_id": current_user.role_id,
    }
