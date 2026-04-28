import uuid
import random
import string
import logging
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from supabase import Client

from app.models.user import User, UserRole
from app.core.config import settings
from app.core.supabase import supabase_admin

logger = logging.getLogger(__name__)

USER_AVATARS_BUCKET = "user-avatars"


class UserService:
    def __init__(self, db: Session = None, supabase: Client = None):
        self.db = db
        self.supabase = supabase

    def get_user_by_phone(self, phone_number: str):
        return self.db.query(User).filter(User.phone_number == phone_number).first()

    # ------------------------------------------------------------------
    # EMAIL VERIFICATION
    # ------------------------------------------------------------------

    def send_verification_email(self, user: User, email: str) -> dict:
        """Store email + generate a 6-digit OTP, then send via SendGrid."""
        # Check email not already taken by another user
        existing = (
            self.db.query(User)
            .filter(User.email == email, User.id != user.id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already linked to another account.",
            )

        code = "".join(random.choices(string.digits, k=6))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        user.email = email
        user.email_verified = False
        user.email_verification_code = code
        user.email_verification_expires_at = expires_at
        self.db.commit()

        self._send_verification_code_email(email, code, user.full_name)

        return {"success": True, "message": "Verification email sent"}

    @staticmethod
    def _send_verification_code_email(email: str, code: str, name: str) -> None:
        """Send the 6-digit OTP via SendGrid. Falls back to console log if not configured."""
        if not settings.SENDGRID_API_KEY or settings.SENDGRID_API_KEY == "your-sendgrid-api-key":
            # Not configured yet — log so developers can still test
            logger.warning(
                "[EMAIL] SendGrid not configured. Verification code for %s: %s",
                email, code,
            )
            return

        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail, To, From, Subject, HtmlContent

            html_body = f"""
            <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                <h2 style="color: #1a1a1a;">Verify your email</h2>
                <p>Hi {name},</p>
                <p>Your AlboTaxi email verification code is:</p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px;
                            text-align: center; padding: 24px; background: #f5f5f5;
                            border-radius: 8px; margin: 24px 0;">
                    {code}
                </div>
                <p>This code expires in <strong>10 minutes</strong>.</p>
                <p style="color: #888; font-size: 13px;">
                    If you didn't request this, you can safely ignore this email.
                </p>
            </div>
            """

            message = Mail(
                from_email=From(settings.SENDGRID_FROM_EMAIL, settings.SENDGRID_FROM_NAME),
                to_emails=To(email),
                subject=Subject("Your AlboTaxi verification code"),
                html_content=HtmlContent(html_body),
            )

            sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
            response = sg.send(message)
            logger.info("[EMAIL] Verification code sent to %s (status=%s)", email, response.status_code)

        except Exception as exc:
            # Email failure must never block the API response — log and continue
            logger.error("[EMAIL] Failed to send verification email to %s: %s", email, exc)

    def confirm_email(self, user: User, code: str) -> dict:
        """Validate the 6-digit code and mark email as verified."""
        if not user.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No email address set. Call /verify-email first.",
            )
        if user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already verified.",
            )
        if not user.email_verification_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No verification code found. Request a new one.",
            )

        now = datetime.now(timezone.utc)
        expires = user.email_verification_expires_at
        # Make expires_at timezone-aware if it isn't
        if expires and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)

        if not expires or now > expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired code.",
            )
        if user.email_verification_code != code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired code.",
            )

        user.email_verified = True
        user.email_verification_code = None
        user.email_verification_expires_at = None
        self.db.commit()

        return {"success": True, "email_verified": True}

    def get_email_status(self, user: User) -> dict:
        return {
            "email": user.email,
            "email_verified": user.email_verified,
        }

    def update_profile(self, user: User, data) -> User:
        if data.full_name is not None:
            user.full_name = data.full_name

        if data.email is not None:
            # Save email and trigger verification — same flow as POST /verify-email
            self.send_verification_email(user, str(data.email))
            # send_verification_email already commits; refresh and return
            self.db.refresh(user)
            return user

        self.db.commit()
        self.db.refresh(user)
        return user

    async def upload_avatar(self, user: User, file: UploadFile) -> str:
        """Upload profile picture to Supabase storage and persist URL."""
        if not file.filename:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided.")

        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in settings.allowed_file_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '.{ext}' not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}",
            )

        file_content = await file.read()
        timestamp = int(datetime.now(timezone.utc).timestamp())
        storage_path = f"{user.id}/avatar_{timestamp}.{ext}"

        # Delete previous avatar if one exists
        if user.profile_image_url:
            try:
                prefix = f"/storage/v1/object/public/{USER_AVATARS_BUCKET}/"
                if prefix in user.profile_image_url:
                    old_path = user.profile_image_url.split(prefix, 1)[1]
                    supabase_admin.storage.from_(USER_AVATARS_BUCKET).remove([old_path])
            except Exception:
                pass  # Non-critical

        try:
            supabase_admin.storage.from_(USER_AVATARS_BUCKET).upload(
                path=storage_path,
                file=file_content,
                file_options={"content-type": file.content_type or "image/jpeg"},
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload avatar: {exc}",
            )

        url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{USER_AVATARS_BUCKET}/{storage_path}"
        user.profile_image_url = url
        self.db.commit()
        return url

    def get_user_data(self, user: User) -> dict:
        """Compile all user data for GDPR download."""
        from app.models.ride import Ride, RideRating, RideStatus
        from app.models.driver import DriverProfile

        profile_data = {
            "id": str(user.id),
            "full_name": user.full_name,
            "phone_number": user.phone_number,
            "email": user.email,
            "email_verified": user.email_verified,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "is_active": user.is_active,
            "profile_image_url": user.profile_image_url,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }

        rides = (
            self.db.query(Ride)
            .filter((Ride.customer_id == user.id))
            .all()
        )
        rides_data = [
            {
                "id": str(r.id),
                "picking_point": r.picking_point,
                "destination": r.destination,
                "price": float(r.price),
                "status": r.status.value if hasattr(r.status, "value") else str(r.status),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rides
        ]

        ratings = self.db.query(RideRating).filter(RideRating.customer_id == user.id).all()
        ratings_data = [
            {
                "ride_id": str(r.ride_id),
                "rate": r.rate,
                "comment": r.comment,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in ratings
        ]

        return {
            "profile": profile_data,
            "rides": rides_data,
            "ratings": ratings_data,
        }

    def hard_delete_account(self, user: User) -> None:
        """Hard-delete: remove from public.users and Supabase auth.users."""
        import logging
        from app.core.supabase import supabase_admin

        _log = logging.getLogger(__name__)

        # Delete from Supabase auth by matching phone number
        try:
            auth_users = supabase_admin.auth.admin.list_users()
            supabase_uid = None
            for au in auth_users:
                if getattr(au, "phone", None) == user.phone_number:
                    supabase_uid = au.id
                    break
            if supabase_uid:
                supabase_admin.auth.admin.delete_user(supabase_uid)
        except Exception as exc:
            _log.warning("Could not delete Supabase auth user for %s: %s", user.phone_number, exc)

        self.db.delete(user)
        self.db.commit()

    def delete_account(self, user: User) -> None:
        """Alias kept for backward compat — delegates to hard_delete_account."""
        self.hard_delete_account(user)
