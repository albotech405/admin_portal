"""
SQLAlchemy engine and session configuration.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from app.core.config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # Test every connection before use — instantly discards dead connections
    # from the pool instead of crashing mid-request.
    pool_pre_ping=True,
    # Recycle connections older than 10 minutes so Supabase never gets the
    # chance to kill them from its end (Supabase idle timeout is ~10 min).
    pool_recycle=600,
    # Keep at most 10 connections open at once; Supabase free tier allows 60.
    pool_size=10,
    # Allow up to 5 extra connections under sudden load bursts.
    max_overflow=5,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
