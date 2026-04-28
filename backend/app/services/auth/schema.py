"""
Auth request/response schemas.
"""

import uuid
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


# --- Requests ---

class PhoneRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+\d{9,15}$",examples=["+243812345678"])


class SignupRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    phone_number: str = Field(..., pattern=r"^\+\d{9,15}$",examples=["+243812345678"])
    role: str = Field(..., pattern=r"^(customer|driver)$", examples=["customer"])
    email: Optional[str] = Field(None, description="Optional email address to save on signup")


class VerifyOTPRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\+\d{9,15}$")
    otp: str = Field(..., min_length=6, max_length=6)
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)


class RefreshRequest(BaseModel):
    refresh_token: str


# --- Responses ---

class MessageResponse(BaseModel):
    message: str


class PhoneCheckResponse(BaseModel):
    exists: bool


class UserResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    phone_number: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str


# --- Email OTP ---

class EmailOtpSendRequest(BaseModel):
    email: str = Field(..., description="Email address to send OTP to")


class EmailOtpVerifyRequest(BaseModel):
    email: str
    otp: str = Field(..., min_length=6, max_length=6)
