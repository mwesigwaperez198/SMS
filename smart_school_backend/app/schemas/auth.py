from pydantic import BaseModel, EmailStr, Field

from app.schemas.user import UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ResetPasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetWithCodeRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    detail: str


class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_uri: str
    manual_code: str


class TwoFactorVerifyRequest(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class TwoFactorLoginResponse(BaseModel):
    requires_2fa: bool = True
    temp_token: str


class TwoFactorLoginVerifyRequest(BaseModel):
    temp_token: str
    code: str = Field(min_length=6, max_length=6)


class TwoFactorStatusResponse(BaseModel):
    is_2fa_enabled: bool


class ProfileResponse(BaseModel):
    user: UserRead
