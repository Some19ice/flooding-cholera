"""Database connection and session management."""
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def get_database_url() -> str:
    """
    Retrieve and validate the configured database URL.
    
    Verifies that the application setting `database_url` specifies a PostgreSQL connection string.
    
    Returns:
        database_url (str): The validated PostgreSQL database URL.
    
    Raises:
        ValueError: If the configured `database_url` does not start with "postgresql".
    """
    database_url = settings.database_url

    if not database_url.startswith("postgresql"):
        raise ValueError(
            "DATABASE_URL must be a PostgreSQL connection string. "
            "SQLite is no longer supported. Please configure a PostgreSQL database."
        )

    return database_url


database_url = get_database_url()

engine = create_engine(
    database_url,
    echo=settings.debug,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    connect_args={"sslmode": settings.database_ssl_mode}
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