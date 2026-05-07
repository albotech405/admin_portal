import uuid
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings
from app.core.supabase import get_supabase

bearer_scheme = HTTPBearer(auto_error=False)

# Use the JWT secret as-is (raw string) — Supabase signs with the literal secret string
_JWT_SECRET = settings.SUPABASE_JWT_SECRET


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
):
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No token provided")

    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            _JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {e}")

    user_id = payload.get("sub")
    role = payload.get("role", "authenticated")

    # Service role tokens don't have a sub claim
    if not user_id and role != "service_role":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub")

    return {"id": user_id, "role": role}


def require_admin(user: dict = Depends(get_current_user)):
    # Service role tokens bypass admin check
    if user.get("role") == "service_role":
        return user

    sb = get_supabase()
    result = sb.table("users").select("is_admin").eq("id", user["id"]).maybe_single().execute()
    if not result.data or not result.data.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user

