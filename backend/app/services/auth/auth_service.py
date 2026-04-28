"""
Auth service - SQLAlchemy for DB, Supabase for OTP/tokens.
"""

import uuid
import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from supabase import Client
from .schema import RefreshRequest, SignupRequest
from app.models.user import User, UserRole
from fastapi.responses import JSONResponse
from supabase_auth.errors import AuthApiError

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: Session = None, supabase: Client = None):
        self.db = db
        self.supabase = supabase


    #---------------------------------------------------------------------------------------------------
    # CHECK PHONE NUMBER
    #---------------------------------------------------------------------------------------------------
    def check_phone(self, phone_number: str) -> bool:
        return self.db.query(User).filter(User.phone_number == phone_number).first() is not None

    #---------------------------------------------------------------------------------------------------
    # RESEND OTP
    #---------------------------------------------------------------------------------------------------
    def send_otp(self, phone_number: str) -> None:
        """Send OTP via Supabase. Swallow non-critical errors — if the SMS was dispatched, the call succeeded."""
        try:
            self.supabase.auth.sign_in_with_otp({"phone": phone_number})
        except AuthApiError as e:
            error_msg = str(e)
            # Supabase rate-limit: "For security purposes, you can only request this after N seconds"
            if "security purposes" in error_msg.lower() or "you can only request" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail={"message": error_msg, "retry_after": 3},
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )
        except Exception:
            # Network/serialisation errors that happen AFTER the SMS is dispatched.
            # Log and continue so the client gets 200 and proceeds to the OTP screen.
            print(f"[WARN] send_otp: non-critical error after dispatch for {phone_number}")


    #---------------------------------------------------------------------------------------------------
    # VERIFY OTP
    #---------------------------------------------------------------------------------------------------
    def verify_otp(self, phone_number: str, otp: str):
        """Verify OTP, returns session with tokens."""
        try:
            response=self.supabase.auth.verify_otp({
                "phone": phone_number,
                "token": otp,
                "type": "sms",
            })
        except AuthApiError:
            return JSONResponse(
                content={"error": "OTP has expired or is invalid. Please request a new one."},
                status_code=401
            )

        user = self.db.query(User).filter(User.phone_number == phone_number).first()
        if not user:
            # OTP verified but user hasn't registered yet (called verify before signup)
            return JSONResponse(
                content={"error": "Phone number verified but no account found. Please sign up first."},
                status_code=404,
            )

        if not user.is_active:
            return JSONResponse(
                content={"error": "Account is deactivated. Please contact support."},
                status_code=403,
            )

        user_response = {
            "id": str(user.id),
            "full_name": user.full_name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "phone_number": user.phone_number,
        }

        # Include driver profile info so frontend can skip onboarding for approved drivers
        if user.driver_profile:
            dp = user.driver_profile
            user_response["driver_profile_id"] = str(dp.id)
            user_response["verification_status"] = (
                dp.verification_status.value if hasattr(dp.verification_status, "value")
                else str(dp.verification_status)
            )

        session = {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
        }

        return JSONResponse(
            content={"user": user_response, "session": session},
            status_code=200,
        )
    #---------------------------------------------------------------------------------------------------
    # REFRESH TOKEN
    #---------------------------------------------------------------------------------------------------
    def refresh_token(self,token_data:RefreshRequest):
        try:
            response= self.supabase.auth.refresh_session(refresh_token=token_data.refresh_token)

            return{
                "access_token":response.session.access_token,
                "refresh_token":response.session.refresh_token
            }
        except Exception as e:
            raise HTTPException(status_code=400,detail=str(e))

    #---------------------------------------------------------------------------------------------------
    # CREATE NEW USER ACCOUNT
    #---------------------------------------------------------------------------------------------------
    def create_user(self, signup_request: SignupRequest) -> User:
        """Create user in public.users after OTP verification."""

        # Check for duplicate before hitting Supabase
        existing = self.db.query(User).filter(User.phone_number == signup_request.phone_number).first()
        if existing:
            if not existing.is_active:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this phone number was previously deleted. Please contact support.",
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already exists",
            )

        # Register in Supabase Auth
        try:
            self.supabase.auth.sign_up({
                "phone": signup_request.phone_number,
                "password": signup_request.phone_number,
                "options": {"data": {"full_name": signup_request.full_name}},
            })
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to register with auth provider: {str(e)}",
            )

        # Create in public.users
        try:
            user = User(
                full_name=signup_request.full_name,
                phone_number=signup_request.phone_number,
                role=UserRole(signup_request.role),
                email=signup_request.email if signup_request.email else None,
                is_active=True,
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        except IntegrityError:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already exists",
            )

        return user

    # ------------------------------------------------------------------
    # HARD DELETE ACCOUNT (both public.users + auth.users)
    # ------------------------------------------------------------------
    def hard_delete_account(self, user: User) -> None:
        """Permanently delete user from public.users and Supabase auth.users."""
        from app.core.supabase import supabase_admin

        # Find Supabase UID by phone
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
            # Log but don't block — DB deletion is more important
            logger.warning("Could not delete Supabase auth user for %s: %s", user.phone_number, exc)

        self.db.delete(user)
        self.db.commit()

    # ------------------------------------------------------------------
    # EMAIL OTP LOGIN
    # ------------------------------------------------------------------
    def send_email_otp(self, email: str) -> None:
        """Trigger Supabase magic-link / email OTP for login."""
        # Verify the email belongs to a registered user
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address.",
            )
        try:
            self.supabase.auth.sign_in_with_otp({"email": email})
        except AuthApiError as e:
            error_msg = str(e)
            if "security purposes" in error_msg.lower() or "you can only request" in error_msg.lower():
                raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=error_msg)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
        except Exception:
            # Non-critical post-dispatch error — SMS/email was already sent
            logger.warning("[WARN] send_email_otp: non-critical error after dispatch for %s", email)

    def verify_email_otp(self, email: str, otp: str):
        """Verify email OTP and return session + user info."""
        try:
            response = self.supabase.auth.verify_otp({
                "email": email,
                "token": otp,
                "type": "email",
            })
        except AuthApiError:
            return JSONResponse(
                content={"error": "OTP has expired or is invalid. Please request a new one."},
                status_code=401,
            )

        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            return JSONResponse(
                content={"error": "No account associated with this email."},
                status_code=404,
            )
        if not user.is_active:
            return JSONResponse(
                content={"error": "Account is deactivated. Please contact support."},
                status_code=403,
            )

        # Mark email as verified since they just proved ownership
        if not user.email_verified:
            user.email_verified = True
            self.db.commit()

        user_response = {
            "id": str(user.id),
            "full_name": user.full_name,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "phone_number": user.phone_number,
            "email": user.email,
            "email_verified": True,
        }

        if user.driver_profile:
            dp = user.driver_profile
            user_response["driver_profile_id"] = str(dp.id)
            user_response["verification_status"] = (
                dp.verification_status.value if hasattr(dp.verification_status, "value")
                else str(dp.verification_status)
            )

        session = {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
        }

        return JSONResponse(content={"user": user_response, "session": session}, status_code=200)

    
    def get_user_by_id(self, user_id: str) -> User | None:
        return self.db.query(User).filter(User.id == uuid.UUID(user_id)).first()

    def sign_out(self) -> None:
        self.supabase.auth.sign_out()
