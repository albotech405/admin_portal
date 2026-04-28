"""
Application configuration using Pydantic Settings.
Best practices:
- Environment variables are loaded from .env file
- Type validation using Pydantic
- Sensible defaults where appropriate
- Computed properties for derived values
"""

from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    """

    # Application Settings
    APP_NAME: str = Field(default="AlboTax Backend")
    APP_VERSION: str = Field(default="1.0.0")
    DEBUG: bool = Field(default=False)
    ENVIRONMENT: str = Field(default="production")

    # API Settings
    API_V1_PREFIX: str = Field(default="/api/v1")
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=8000)

    # Supabase Configuration
    SUPABASE_URL: str = Field(
        ...,  # Required field
        description="Supabase project URL"
    )
    SUPABASE_KEY: str = Field(
        ...,  # Required field
        description="Supabase anon/public key"
    )
    SUPABASE_JWT_SECRET: str = Field(
        ...,  # Required field
        description="Supabase jwt secret key (use with caution)"
    )
    SUPABASE_SERVICE_KEY: str = Field(
        ...,  # Required field
        description="Supabase service role key (use with caution)"
    )

    # Database
    DATABASE_URL: str = Field(
        ...,  # Required field
        description="PostgreSQL connection string"
    )

    # CORS
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,http://localhost:5173"
    )
    ALLOWED_METHODS: str = Field(default="GET,POST,PUT,DELETE,PATCH")
    ALLOWED_HEADERS: str = Field(default="*")

    # File Upload
    MAX_UPLOAD_SIZE: int = Field(
        default=10485760,  # 10MB
        description="Maximum file upload size in bytes"
    )
    ALLOWED_EXTENSIONS: str = Field(default="jpg,jpeg,png,pdf")

    # Ride Settings
    RIDE_SEARCH_RADIUS_KM: int = Field(default=10, description="Search radius for nearby drivers in km")
    RIDE_REQUEST_EXPIRY_MINUTES: int = Field(default=5, description="Ride request expiry time in minutes")
    DRIVER_LOCATION_STALE_MINUTES: int = Field(default=5, description="Max age of driver location before considered stale")

    # Fare Calculation (amounts in CDF)
    FARE_CAR_BASE: float = Field(default=3000.0, description="Car base fare in CDF")
    FARE_CAR_PER_KM: float = Field(default=500.0, description="Car fare per km in CDF")
    FARE_CAR_PER_MIN: float = Field(default=50.0, description="Car fare per minute in CDF")
    FARE_MOTO_BASE: float = Field(default=1500.0, description="Motorcycle base fare in CDF")
    FARE_MOTO_PER_KM: float = Field(default=300.0, description="Motorcycle fare per km in CDF")
    FARE_MOTO_PER_MIN: float = Field(default=30.0, description="Motorcycle fare per minute in CDF")
    PLATFORM_COMMISSION_PERCENT: float = Field(default=15.0, description="Platform commission % deducted from driver earnings")

    # Wallet Settings
    PLATFORM_FEE_PER_RIDE: float = Field(default=10.00, description="Platform fee deducted from driver wallet per completed ride (USD)")
    USD_TO_CDF_RATE: float = Field(default=2850.0, description="USD to CDF exchange rate (update via env var when rate changes)")
    PAYMENT_PROOFS_BUCKET: str = Field(default="payment-proofs", description="Supabase storage bucket for proof of payment images")

    # M-Pesa OpenAPI Settings
    MPESA_API_KEY: str = Field(default="", description="M-Pesa OpenAPI application API key")
    MPESA_PUBLIC_KEY: str = Field(default="", description="M-Pesa OpenAPI RSA public key (base64 DER)")
    MPESA_SERVICE_PROVIDER_CODE: str = Field(default="", description="Organization shortcode on M-Pesa")
    MPESA_ENVIRONMENT: str = Field(default="sandbox", description="sandbox or openapi (production)")
    MPESA_CALLBACK_URL: str = Field(default="", description="Public HTTPS URL M-Pesa will POST async results to")

    @property
    def mpesa_base_url(self) -> str:
        env = "sandbox" if self.MPESA_ENVIRONMENT == "sandbox" else "openapi"
        return f"https://openapi.m-pesa.com/{env}/ipg/v2/vodacomDRC"

    # Twilio — SMS (SOS alerts)
    TWILIO_ACCOUNT_SID: str = Field(default="", description="Twilio Account SID")
    TWILIO_AUTH_TOKEN: str = Field(default="", description="Twilio Auth Token")
    TWILIO_FROM_NUMBER: str = Field(default="", description="Twilio sender phone number in E.164 format e.g. +12345678900")

    # Google Maps — SOS tracking page
    GOOGLE_MAPS_API_KEY: str = Field(default="", description="Google Maps JavaScript API key for the live tracking page")

    # SOS Settings
    SOS_SESSION_EXPIRY_HOURS: int = Field(default=24, description="How long an SOS tracking session stays active")
    APP_BASE_URL: str = Field(default="http://localhost:8000", description="Public-facing base URL (used to build SOS tracking links in SMS)")

    # SendGrid — email verification
    # SENDGRID_API_KEY: SendGrid dashboard → Settings → API Keys → Create API Key (Mail Send permission)
    # SENDGRID_FROM_EMAIL: the verified sender address in your SendGrid account
    SENDGRID_API_KEY: str = Field(default="", description="SendGrid API key for sending emails")
    SENDGRID_FROM_EMAIL: str = Field(default="noreply@albotaxi.com", description="Verified sender email address")
    SENDGRID_FROM_NAME: str = Field(default="AlboTaxi", description="Sender display name")

    # Notification Settings
    ENABLE_PUSH_NOTIFICATIONS: bool = Field(default=True)
    ENABLE_EMAIL_NOTIFICATIONS: bool = Field(default=True)
    ENABLE_SMS_NOTIFICATIONS: bool = Field(default=False)

    # Firebase Cloud Messaging (push notifications)
    # FIREBASE_PROJECT_ID: Firebase Console → Project Settings → General → Project ID
    # FIREBASE_SERVICE_ACCOUNT_JSON: Firebase Console → Project Settings → Service Accounts
    #   → Generate new private key → download JSON → paste entire file content as single-line string
    FIREBASE_PROJECT_ID: str = Field(default="", description="Firebase project ID")
    FIREBASE_SERVICE_ACCOUNT_JSON: str = Field(
        default="",
        description="Firebase service account JSON (full JSON content as a string)",
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"  # Ignore extra fields in .env
    )

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def cors_methods(self) -> List[str]:
        """Parse CORS methods from comma-separated string."""
        return [method.strip() for method in self.ALLOWED_METHODS.split(",")]

    @property
    def allowed_file_extensions(self) -> List[str]:
        """Parse allowed file extensions from comma-separated string."""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    @field_validator("ENVIRONMENT")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment is one of the allowed values."""
        allowed = ["development", "staging", "production", "testing"]
        if v.lower() not in allowed:
            raise ValueError(f"Environment must be one of {allowed}")
        return v.lower()


# Singleton instance
settings = Settings()


 
