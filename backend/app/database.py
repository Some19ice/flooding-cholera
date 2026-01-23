"""Database connection and session management."""
import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def get_database_url() -> str:
    """Get the database URL, with SQLite fallback for development."""
    database_url = settings.database_url

    # Use SQLite if configured or if PostgreSQL is not available
    if database_url.startswith("postgresql") and settings.use_sqlite_fallback:
        sqlite_path = os.path.join(os.path.dirname(__file__), "..", "data", "cholera.db")
        os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
        database_url = f"sqlite:///{os.path.abspath(sqlite_path)}"
        logger.info(f"Using SQLite database: {sqlite_path}")

    return database_url


database_url = get_database_url()

engine = create_engine(
    database_url,
    echo=settings.debug,
    connect_args={"check_same_thread": False} if database_url.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables.

    Note: For production, use Alembic migrations instead.
    This function is kept for development/testing convenience.
    Run: alembic upgrade head
    """
    from app.models import lga, case_report, environmental
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized (development mode)")
