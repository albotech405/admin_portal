import base64
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings
from app.core.supabase import get_supabase

bearer_scheme = HTTPBearer(auto_error=False)

# Supabase JWT secrets are base64-encoded; python-jose needs the raw bytes.
try:
    _JWT_SECRET: bytes | str = base64.b64decode(settings.SUPABASE_JWT_SECRET)
except Exception:
    _JWT_SECRET = settings.SUPABASE_JWT_SECRET

# Role hierarchy: higher index = more permissive override
ROLE_HIERARCHY = ["readonly", "support", "finance", "operations", "super_admin"]


def _role_rank(role: Optional[str]) -> int:
    if role not in ROLE_HIERARCHY:
        return -1
    return ROLE_HIERARCHY.index(role)


def _has_required_role(role: Optional[str], allowed_roles: tuple[str, ...]) -> bool:
    if role == "super_admin":
        return True

    role_rank = _role_rank(role)
    if role_rank < 0:
        return False

    return any(role_rank >= _role_rank(allowed_role) for allowed_role in allowed_roles)


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

    if not user_id and role != "service_role":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub")

    return {"id": user_id, "role": role}


def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") == "service_role":
        return user

    sb = get_supabase()
    result = (
        sb.table("users")
        .select("is_admin, is_active, admin_role")
        .eq("id", user["id"])
        .maybe_single()
        .execute()
    )
    if not result.data or not result.data.get("is_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    if not result.data.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin account disabled")

    # Attach admin_role to the user dict for downstream use
    user["admin_role"] = result.data.get("admin_role")
    return user


def require_role(*allowed_roles: str):
    """
    Factory that returns a FastAPI dependency enforcing the minimum role level.
    Higher-privilege roles inherit permissions from lower ones.

    Usage:
        @router.post("/sensitive")
        def endpoint(_user=Depends(require_role("finance"))):
    """
    def _dep(user: dict = Depends(require_admin)):
        if user.get("role") == "service_role":
            return user
        role = user.get("admin_role")
        if not _has_required_role(role, allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {', '.join(allowed_roles)}",
            )
        return user
    return _dep

