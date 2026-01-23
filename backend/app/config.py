"""Configuration settings for the application."""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/cholera_surveillance"
    use_sqlite_fallback: bool = True  # Use SQLite if PostgreSQL unavailable

    # Google Earth Engine
    gee_service_account_email: Optional[str] = None
    gee_private_key_path: Optional[str] = None

    # NASA Earthdata
    nasa_earthdata_username: Optional[str] = None
    nasa_earthdata_password: Optional[str] = None

    # OpenWeatherMap
    openweathermap_api_key: Optional[str] = None

    # App settings
    debug: bool = True
    cors_origins: str = "http://localhost:5173,http://localhost:3000,https://flooding-cholera.vercel.app"

    # Rate limiting
    rate_limit_requests: int = 100  # requests per minute for general endpoints
    rate_limit_upload: int = 10  # requests per minute for upload endpoints

    # External API timeouts (in seconds)
    external_api_timeout: int = 30
    satellite_api_timeout: int = 60

    # Sentry
    sentry_dsn: Optional[str] = None
    sentry_environment: str = "development"
    sentry_traces_sample_rate: float = 0.1

    # Cross River State bounding box (approximate)
    crs_bbox: dict = {
        "min_lon": 7.5,
        "max_lon": 9.5,
        "min_lat": 4.5,
        "max_lat": 7.0
    }

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
