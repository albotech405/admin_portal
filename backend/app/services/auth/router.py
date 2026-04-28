from fastapi import HTTPException, APIRouter, status,Depends
from app.services.auth.auth_service import AuthService
from app.services.auth.schema import RefreshRequest, SignupRequest, EmailOtpSendRequest, EmailOtpVerifyRequest
from app.db.engine import get_db
from sqlalchemy.orm import Session
from app.core.supabase import supabase
from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth")

@router.post("/phone", description="Check if there is any user with the provided phone number. E.G: +27672407846")
async def check_phone_number(phone_num: str, db:Session = Depends(get_db)):
    auth_service= AuthService(db,supabase)
    exists = auth_service.check_phone(phone_number=phone_num)
    return {"exists": exists}

@router.post("/otp/send", description="Verify OTP. E.G: +27672407846")
async def send_otp(phone_number: str,db:Session = Depends(get_db)):
    auth_service= AuthService(db,supabase)
    return auth_service.send_otp(phone_number) 

@router.post("/otp/verify", description="Verify OTP. E.G: +27672407846")
async def verify_otp( phone_number: str, otp: str, db:Session = Depends(get_db)):
    auth_service= AuthService(db,supabase)
    return auth_service.verify_otp(phone_number,otp)



@router.post("/signup", description="Create new user account")
async def sign_up(signup_request:SignupRequest, db:Session = Depends(get_db)):
    auth_service= AuthService(db,supabase)
    return auth_service.create_user(signup_request)


@router.post("/refresh-token", description="This end point generate a new and fresh access token (jwt) together with its refresh token")
async def refresh_token(token_data:RefreshRequest, db:Session = Depends(get_db)):
    auth_service= AuthService(db,supabase)
    return auth_service.refresh_token(token_data=token_data)


@router.post("/email/otp/send", description="Send a one-time login code to the user's registered email address")
async def send_email_otp(data: EmailOtpSendRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db, supabase)
    auth_service.send_email_otp(data.email)
    return {"success": True, "message": "Login code sent to email"}


@router.post("/email/otp/verify", description="Verify email OTP and receive session tokens")
async def verify_email_otp(data: EmailOtpVerifyRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db, supabase)
    return auth_service.verify_email_otp(data.email, data.otp)


@router.delete("/account", status_code=204, description="Permanently delete account from both public.users and Supabase auth")
async def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    auth_service = AuthService(db, supabase)
    auth_service.hard_delete_account(user)