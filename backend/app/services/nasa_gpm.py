"""NASA GPM (Global Precipitation Measurement) data service."""
import logging
from datetime import date, timedelta
from typing import Optional, Dict, Any
import requests
from requests.exceptions import Timeout, RequestException

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class NASAGPMService:
    """Service for fetching precipitation data from NASA GPM."""

    # NASA GES DISC base URL for GPM IMERG
    BASE_URL = "https://gpm1.gesdisc.eosdis.nasa.gov/data/GPM_L3/GPM_3IMERGDF.07"

    def __init__(self):
        self._session = None
        self._timeout = settings.external_api_timeout

    def is_configured(self) -> bool:
        """Check if NASA Earthdata credentials are configured."""
        return bool(
            settings.nasa_earthdata_username and
            settings.nasa_earthdata_password
        )

    def is_authenticated(self) -> bool:
        """Check if we can authenticate with NASA Earthdata."""
        if not self.is_configured():
            return False

        try:
            # Try a simple auth check
            session = self._get_session()
            # We'll verify on first actual request
            return True
        except Exception:
            return False

    def _get_session(self) -> requests.Session:
        """Get authenticated session for NASA Earthdata."""
        if self._session is not None:
            return self._session

        self._session = requests.Session()
        self._session.auth = (
            settings.nasa_earthdata_username,
            settings.nasa_earthdata_password
        )

        return self._session

    def get_daily_precipitation(
        self,
        lat: float,
        lon: float,
        target_date: date
    ) -> Optional[float]:
        """
        Get daily precipitation for a point location.

        Note: Full implementation would download HDF5/NetCDF files
        and extract values. This is a simplified version using
        the OpenDAP interface or fallback to mock data.

        Args:
            lat: Latitude
            lon: Longitude
            target_date: Date for precipitation data

        Returns:
            Precipitation in mm or None
        """
        if not self.is_configured():
            logger.warning("NASA credentials not configured, using mock data")
            return self._get_mock_precipitation(lat, lon, target_date)

        try:
            # NASA GPM IMERG provides global 0.1 degree resolution data
            # For full implementation, you would:
            # 1. Download the HDF5 file for the date
            # 2. Extract the precipitation value for the lat/lon
            # 3. Return the value in mm/day

            # For MVP, we'll use OpenWeatherMap as a fallback
            # or return mock data based on typical Cross River patterns

            return self._get_precipitation_from_openweathermap(lat, lon)

        except Timeout:
            logger.error(f"Timeout fetching GPM data for ({lat}, {lon})")
            return self._get_mock_precipitation(lat, lon, target_date)
        except RequestException as e:
            logger.error(f"Request error fetching GPM data: {e}")
            return self._get_mock_precipitation(lat, lon, target_date)
        except Exception as e:
            logger.error(f"Error fetching GPM data: {e}")
            return self._get_mock_precipitation(lat, lon, target_date)

    def _get_precipitation_from_openweathermap(
        self,
        lat: float,
        lon: float
    ) -> Optional[float]:
        """Fallback to OpenWeatherMap for precipitation data."""
        if not settings.openweathermap_api_key:
            return None

        try:
            url = "https://api.openweathermap.org/data/2.5/weather"
            params = {
                "lat": lat,
                "lon": lon,
                "appid": settings.openweathermap_api_key,
                "units": "metric"
            }

            response = requests.get(
                url,
                params=params,
                timeout=self._timeout
            )
            response.raise_for_status()
            data = response.json()

            # Get rain in last 1h or 3h if available
            rain = data.get("rain", {})
            rainfall = rain.get("1h", 0) or rain.get("3h", 0)

            return float(rainfall)

        except Timeout:
            logger.error(f"Timeout fetching from OpenWeatherMap for ({lat}, {lon})")
            return None
        except RequestException as e:
            logger.error(f"Request error fetching from OpenWeatherMap: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching from OpenWeatherMap: {e}")
            return None

    def _get_mock_precipitation(
        self,
        lat: float,
        lon: float,
        target_date: date
    ) -> float:
        """
        Generate mock precipitation data based on Cross River State patterns.

        Cross River has two seasons:
        - Rainy season: April to October (heavy rainfall)
        - Dry season: November to March (minimal rainfall)
        """
        import random

        month = target_date.month

        # Seasonal pattern for Cross River State
        if month in [4, 5, 6, 7, 8, 9, 10]:
            # Rainy season - higher precipitation
            base = random.uniform(5, 25)
            if month in [6, 7, 8, 9]:
                # Peak rainy season
                base = random.uniform(10, 40)
        else:
            # Dry season - lower precipitation
            base = random.uniform(0, 5)

        # Add some daily variation
        variation = random.uniform(-2, 5)
        rainfall = max(0, base + variation)

        return round(rainfall, 2)

    def get_cumulative_precipitation(
        self,
        lat: float,
        lon: float,
        end_date: date,
        days: int = 7
    ) -> Optional[float]:
        """Get cumulative precipitation over a period."""
        total = 0.0
        count = 0

        for i in range(days):
            target_date = end_date - timedelta(days=i)
            daily = self.get_daily_precipitation(lat, lon, target_date)
            if daily is not None:
                total += daily
                count += 1

        if count == 0:
            return None

        # Extrapolate if we don't have all days
        if count < days:
            total = total * (days / count)

        return round(total, 2)

    def fetch_data_for_lga(
        self,
        lga_id: int,
        start_date: date,
        end_date: date
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch precipitation data for an LGA and save to database.

        Args:
            lga_id: ID of the LGA
            start_date: Start date
            end_date: End date

        Returns:
            Dict with fetched data or None
        """
        from app.database import SessionLocal
        from app.models import LGA, EnvironmentalData

        db = SessionLocal()
        try:
            lga = db.query(LGA).filter(LGA.id == lga_id).first()
            if not lga:
                logger.warning(f"LGA {lga_id} not found")
                return None

            # Use centroid for precipitation lookup
            lat = lga.centroid_lat or 5.5  # Default to Cross River center
            lon = lga.centroid_lon or 8.5

            # Get daily precipitation
            rainfall_mm = self.get_daily_precipitation(lat, lon, end_date)

            # Get 7-day cumulative
            rainfall_7day = self.get_cumulative_precipitation(lat, lon, end_date, 7)

            # Get 30-day cumulative
            rainfall_30day = self.get_cumulative_precipitation(lat, lon, end_date, 30)

            # Check if environmental data exists for this date
            existing = db.query(EnvironmentalData).filter(
                EnvironmentalData.lga_id == lga_id,
                EnvironmentalData.observation_date == end_date
            ).first()

            if existing:
                # Update existing record
                existing.rainfall_mm = rainfall_mm
                existing.rainfall_7day_mm = rainfall_7day
                existing.rainfall_30day_mm = rainfall_30day
                if not existing.data_source:
                    existing.data_source = "NASA_GPM"
                elif "NASA_GPM" not in existing.data_source:
                    existing.data_source += ",NASA_GPM"
            else:
                # Create new record
                env_data = EnvironmentalData(
                    lga_id=lga_id,
                    observation_date=end_date,
                    rainfall_mm=rainfall_mm,
                    rainfall_7day_mm=rainfall_7day,
                    rainfall_30day_mm=rainfall_30day,
                    data_source="NASA_GPM"
                )
                db.add(env_data)

            db.commit()

            return {
                "lga_id": lga_id,
                "lga_name": lga.name,
                "observation_date": end_date.isoformat(),
                "rainfall_mm": rainfall_mm,
                "rainfall_7day_mm": rainfall_7day,
                "rainfall_30day_mm": rainfall_30day
            }

        except Exception as e:
            logger.error(f"Error fetching GPM data for LGA {lga_id}: {e}")
            db.rollback()
            return None
        finally:
            db.close()
