from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.rate_limit import limiter, HAS_LIMITER
from app.core.security import decode_refresh_token, decode_temp_token, create_temp_token
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ProfileResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    ResetWithCodeRequest,
    TokenResponse,
    TwoFactorLoginResponse,
    TwoFactorLoginVerifyRequest,
    TwoFactorSetupResponse,
    TwoFactorStatusResponse,
    TwoFactorVerifyRequest,
)
from app.services.auth_service import (
    authenticate_user,
    build_refresh_token,
    build_user_token,
    disable_2fa,
    enable_2fa,
    generate_totp_secret,
    request_password_reset,
    reset_password,
    verify_reset_code,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse | TwoFactorLoginResponse)
def login(
    request: Request,
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse | TwoFactorLoginResponse:
    user = authenticate_user(db, str(payload.email).lower(), payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.is_2fa_enabled:
        temp_token = create_temp_token(str(user.id))
        return TwoFactorLoginResponse(requires_2fa=True, temp_token=temp_token)

    return TokenResponse(
        access_token=build_user_token(user),
        refresh_token=build_refresh_token(user),
        user=user,
    )


@router.post("/verify-2fa-login", response_model=TokenResponse)
def verify_2fa_login(
    payload: TwoFactorLoginVerifyRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    from app.services.auth_service import verify_totp_code

    token_data = decode_temp_token(payload.temp_token)
    if not token_data or not token_data.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired 2FA session",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(token_data["sub"])
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA session",
        )

    user = db.get(User, user_id)
    if not user or not user.is_active or not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or 2FA not configured",
        )

    if not verify_totp_code(user.totp_secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code",
        )

    return TokenResponse(
        access_token=build_user_token(user),
        refresh_token=build_refresh_token(user),
        user=user,
    )


@router.post("/refresh-token", response_model=AccessTokenResponse)
def refresh_token(
    request: Request,
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db),
) -> AccessTokenResponse:
    token_payload = decode_refresh_token(payload.refresh_token)
    if not token_payload or not token_payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(token_payload["sub"])
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token subject",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AccessTokenResponse(access_token=build_user_token(user))


@router.post("/reset-password", response_model=MessageResponse)
def reset_password_route(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    reset_password(db, current_user, payload.current_password, payload.new_password)
    return MessageResponse(detail="Password updated")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    msg = request_password_reset(db, payload.email)
    return MessageResponse(detail=msg)


@router.post("/reset-password-with-code", response_model=MessageResponse)
def reset_password_with_code(
    payload: ResetWithCodeRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    msg = verify_reset_code(db, payload.email, payload.code, payload.new_password)
    return MessageResponse(detail=msg)


@router.get("/2fa/status", response_model=TwoFactorStatusResponse)
def two_factor_status(
    current_user: User = Depends(get_current_user),
) -> TwoFactorStatusResponse:
    return TwoFactorStatusResponse(is_2fa_enabled=current_user.is_2fa_enabled or False)


@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
def two_factor_setup(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TwoFactorSetupResponse:
    secret, uri, manual = generate_totp_secret(current_user)
    current_user.totp_secret = secret
    current_user.is_2fa_enabled = False
    db.add(current_user)
    db.commit()
    return TwoFactorSetupResponse(secret=secret, qr_uri=uri, manual_code=manual)


@router.post("/2fa/enable", response_model=MessageResponse)
def two_factor_enable(
    payload: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    msg = enable_2fa(db, current_user, payload.code)
    return MessageResponse(detail=msg)


@router.post("/2fa/disable", response_model=MessageResponse)
def two_factor_disable(
    payload: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    msg = disable_2fa(db, current_user, payload.code)
    return MessageResponse(detail=msg)


@router.get("/profile", response_model=ProfileResponse)
def profile(current_user: User = Depends(get_current_user)) -> ProfileResponse:
    return ProfileResponse(user=current_user)
