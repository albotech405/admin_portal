"""
Application lifecycle events (startup and shutdown).
"""

from fastapi import FastAPI
from app.core.config import get_settings
from app.core.supabase import SupabaseClient


def create_start_app_handler(app: FastAPI):
    """
    Create startup event handler.

    Args:
        app: FastAPI application instance

    Returns:
        Startup event handler function
    """
    async def start_app() -> None:
        settings = get_settings()

        # Log startup
        print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
        print(f"📍 Environment: {settings.ENVIRONMENT}")
        print(f"🔧 Debug mode: {settings.DEBUG}")

        # Initialize Supabase connection
        try:
            supabase = SupabaseClient.get_client()
            print("✅ Supabase client initialized successfully")

            # Test connection (optional)
            if settings.DEBUG:
                # You can add a simple query here to test the connection
                print("🔍 Testing Supabase connection...")
                # Example: supabase.table('health_check').select('*').limit(1).execute()

        except Exception as e:
            print(f"❌ Failed to initialize Supabase: {str(e)}")
            if settings.ENVIRONMENT == "production":
                raise  # Fail fast in production

        print(f"🌐 API will be available at http://{settings.HOST}:{settings.PORT}")
        print(f"📚 API docs at http://{settings.HOST}:{settings.PORT}/docs")

    return start_app


def create_stop_app_handler(app: FastAPI):
    """
    Create shutdown event handler.

    Args:
        app: FastAPI application instance

    Returns:
        Shutdown event handler function
    """
    async def stop_app() -> None:
        settings = get_settings()

        print(f"🛑 Shutting down {settings.APP_NAME}")

        # Close Supabase connections
        SupabaseClient.close()
        print("✅ Supabase connections closed")

        print("👋 Application shutdown complete")

    return stop_app
