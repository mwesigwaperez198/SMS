import json

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.core.security import create_access_token, create_refresh_token
from app.db.session import get_db
from app.models.user import User
from app.services.face_service import extract_embedding, verify_face

router = APIRouter(prefix="/face-auth", tags=["face-auth"])


class FaceImageRequest(BaseModel):
    image_data: str  # base64 data URL  e.g. "data:image/jpeg;base64,..."


class FaceLoginRequest(BaseModel):
    email: str
    image_data: str


class FaceLoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


# ── Register face (requires existing JWT login) ──────────────────────────────

@router.post("/register", summary="Register face for current user")
def register_face(
    req: FaceImageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    embedding = extract_embedding(req.image_data)
    if embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face detected. Ensure good lighting and your face is clearly visible.",
        )
    current_user.face_descriptor = json.dumps(embedding)
    db.commit()
    return {"detail": "Face registered successfully", "user_id": current_user.id}


# ── Verify face (requires existing JWT — used for 2FA step) ─────────────────

@router.post("/verify", summary="Verify face against registered descriptor")
def verify_face_endpoint(
    req: FaceImageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if not current_user.face_descriptor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face registered. Go to Profile → Security to register your face first.",
        )
    matched = verify_face(req.image_data, current_user.face_descriptor)
    if not matched:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Face verification failed. Try again with better lighting.",
        )
    return {"detail": "Face verified", "matched": True}


# ── Face login (unauthenticated — email + face = tokens) ────────────────────

@router.post("/login", response_model=FaceLoginResponse, summary="Login using email + face scan")
def face_login(
    req: FaceLoginRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No active account found for this email.",
        )
    if not user.face_descriptor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Face login not set up for this account. Use password login instead.",
        )
    matched = verify_face(req.image_data, user.face_descriptor)
    if not matched:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Face not recognised. Try again with better lighting or use password login.",
        )

    claims = {"role_id": user.role_id, "school_id": user.school_id}
    return FaceLoginResponse(
        access_token=create_access_token(str(user.id), claims=claims),
        refresh_token=create_refresh_token(str(user.id), claims=claims),
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role_id": user.role_id,
            "school_id": user.school_id,
        },
    )


# ── Status check ─────────────────────────────────────────────────────────────

@router.get("/status", summary="Check if current user has a face registered")
def face_status(
    current_user: User = Depends(deps.get_current_user),
):
    return {
        "face_registered": bool(current_user.face_descriptor),
        "user_id": current_user.id,
        "role_id": current_user.role_id,
    }


# ── Remove face ───────────────────────────────────────────────────────────────

@router.delete("/remove", summary="Remove registered face for current user")
def remove_face(
    db: Session = Depends(get_db),
    current_user: User = Depends(deps.get_current_user),
):
    if not current_user.face_descriptor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No face registered to remove.",
        )
    current_user.face_descriptor = None
    db.commit()
    return {"detail": "Face removed successfully"}
