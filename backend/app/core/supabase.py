from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

_client: Optional[Client] = None
_admin_client: Optional[Client] = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _client


def get_supabase_admin() -> Client:
    """Service-role client used for Auth admin operations (create/delete users)."""
    global _admin_client
    if _admin_client is None:
        _admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _admin_client
