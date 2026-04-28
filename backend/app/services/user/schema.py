"""
User request/response schemas.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# REQUESTS
# ---------------------------------------------------------------------------

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = Field(None, description="Setting this saves the email and triggers a verification code")


class SendVerificationEmailRequest(BaseModel):
    email: EmailStr


class ConfirmEmailRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, examples=["123456"])


# ---------------------------------------------------------------------------
# RESPONSES
# ---------------------------------------------------------------------------

class EmailStatusResponse(BaseModel):
    email: Optional[str] = None
    email_verified: bool


class VerifyEmailResponse(BaseModel):
    success: bool
    message: str


class ConfirmEmailResponse(BaseModel):
    success: bool
    email_verified: bool


class AvatarResponse(BaseModel):
    profile_image_url: str


class RegisterFcmTokenRequest(BaseModel):
    token: str = Field(..., min_length=1, max_length=512, description="FCM device registration token")


class RegisterFcmTokenResponse(BaseModel):
    success: bool = True
