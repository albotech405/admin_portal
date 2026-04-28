from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.engine import get_db
from app.models.user import User
from app.services.user.user_service import UserService
from app.services.user.schema import (
    UpdateProfileRequest,
    SendVerificationEmailRequest,
    ConfirmEmailRequest,
    EmailStatusResponse,
    VerifyEmailResponse,
    ConfirmEmailResponse,
    AvatarResponse,
    RegisterFcmTokenRequest,
    RegisterFcmTokenResponse,
)

router = APIRouter(prefix="/user")


@router.get("/", summary="Get current user from JWT")
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/", summary="Update profile (full_name)")
@router.put("/", summary="Update profile (full_name) — PUT alias for PATCH")
async def update_profile(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db=db)
    return service.update_profile(user, data)


@router.delete("/", status_code=204, summary="Delete (deactivate) account")
async def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db=db)
    service.delete_account(user)


# ------------------------------------------------------------------
# PRIVACY / GDPR
# ------------------------------------------------------------------
@router.get("/data", summary="Download all personal data (GDPR)")
async def download_user_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db=db)
    return service.get_user_data(user)


@router.delete("/data", status_code=204, summary="Permanently delete account and all personal data")
async def delete_user_data(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db=db)
    service.hard_delete_account(user)


# ------------------------------------------------------------------
# 4.1 SEND VERIFICATION EMAIL
# ------------------------------------------------------------------
@router.post(
    "/verify-email",
    response_model=VerifyEmailResponse,
    summary="Send email verification code",
)
async def send_verification_email(
    data: SendVerificationEmailRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db=db)
    return service.send_verification_email(user, data.email)


# ------------------------------------------------------------------
# 4.2 CONFIRM EMAIL
# ------------------------------------------------------------------
@router.post(
    "/confirm-email",
    response_model=ConfirmEmailResponse,
    summary="Confirm email with 6-digit code",
)
async def confirm_email(
    data: ConfirmEmailRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db=db)
    return service.confirm_email(user, data.code)


# ------------------------------------------------------------------
# 4.3 GET EMAIL STATUS
# ------------------------------------------------------------------
@router.get(
    "/email-status",
    response_model=EmailStatusResponse,
    summary="Get email and verification status",
)
async def email_status(
    user: User = Depends(get_current_user),
):
    return EmailStatusResponse(
        email=user.email,
        email_verified=user.email_verified,
    )


# ------------------------------------------------------------------
# AVATAR UPLOAD
# ------------------------------------------------------------------
@router.post(
    "/avatar",
    response_model=AvatarResponse,
    summary="Upload or replace profile picture",
)
async def upload_avatar(
    file: UploadFile = File(..., description="Profile image (jpg, jpeg, png)"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = UserService(db=db)
    url = await service.upload_avatar(user, file)
    return AvatarResponse(profile_image_url=url)


# ------------------------------------------------------------------
# FCM TOKEN REGISTRATION
# ------------------------------------------------------------------
@router.put(
    "/fcm-token",
    response_model=RegisterFcmTokenResponse,
    summary="Register or refresh FCM device token for push notifications",
)
async def register_fcm_token(
    data: RegisterFcmTokenRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.fcm_token = data.token
    db.commit()
    return RegisterFcmTokenResponse()
