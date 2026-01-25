"""Google Earth Engine integration service."""
import os
import logging
from datetime import date, timedelta
from typing import Optional, Dict, Any, List

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EarthEngineService:
    """Service for fetching satellite data from Google Earth Engine."""

    def __init__(self):
        self._authenticated = False
        self._ee = None
        self._timeout = settings.satellite_api_timeout

    def is_configured(self) -> bool:
        """Check if GEE credentials are configured."""
        return bool(
            settings.gee_service_account_email and
            settings.gee_private_key_path and
            os.path.exists(settings.gee_private_key_path or "")
        )

    def is_authenticated(self) -> bool:
        """Check if authenticated with GEE."""
        return self._authenticated

    def authenticate(self) -> bool:
        """Authenticate with Google Earth Engine."""
        if not self.is_configured():
            logger.warning("GEE credentials not configured")
            return False

        try:
            import ee
            credentials = ee.ServiceAccountCredentials(
                settings.gee_service_account_email,
                settings.gee_private_key_path
            )
            ee.Initialize(credentials)
            self._authenticated = True
            self._ee = ee
            logger.info("Successfully authenticated with Google Earth Engine")
            return True
        except Exception as e:
            logger.error(f"Failed to authenticate with GEE: {e}")
            return False

    def get_flood_index(
        self,
        geometry: Dict[str, Any],
        start_date: date,
        end_date: date
    ) -> Optional[Dict[str, float]]:
        """
        Calculate NDWI (Normalized Difference Water Index) for flood detection.
        Uses Sentinel-2 imagery.

        Args:
            geometry: GeoJSON geometry for area of interest
            start_date: Start date for imagery
            end_date: End date for imagery

        Returns:
            Dict with ndwi_mean, ndwi_max, flood_extent_pct
        """
        if not self._authenticated:
            if not self.authenticate():
                return None

        try:
            ee = self._ee

            # Convert GeoJSON to EE geometry
            aoi = ee.Geometry(geometry)

            # Get Sentinel-2 imagery
            s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
                .filterBounds(aoi) \
                .filterDate(start_date.isoformat(), end_date.isoformat()) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))

            # Check if collection is empty (with timeout consideration)
            size_info = s2.size().getInfo()
            if size_info == 0:
                logger.warning("No Sentinel-2 images found for date range")
                return None

            # Calculate NDWI: (Green - NIR) / (Green + NIR)
            def add_ndwi(image):
                ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI')
                return image.addBands(ndwi)

            s2_ndwi = s2.map(add_ndwi)

            # Get mean NDWI composite
            ndwi_composite = s2_ndwi.select('NDWI').mean()

            # Calculate statistics
            stats = ndwi_composite.reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    reducer2=ee.Reducer.max(),
                    sharedInputs=True
                ),
                geometry=aoi,
                scale=10,
                maxPixels=1e9
            ).getInfo()

            # Calculate flood extent (NDWI > 0.3 typically indicates water)
            water_mask = ndwi_composite.gt(0.3)
            flood_stats = water_mask.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=aoi,
                scale=10,
                maxPixels=1e9
            ).getInfo()

            return {
                "ndwi_mean": stats.get("NDWI_mean"),
                "ndwi_max": stats.get("NDWI_max"),
                "flood_extent_pct": (flood_stats.get("NDWI", 0) or 0) * 100
            }

        except TimeoutError:
            logger.error("Timeout while fetching NDWI data from GEE")
            return None
        except Exception as e:
            logger.error(f"Error calculating NDWI: {e}")
            return None

    def get_sar_flood_mapid(
        self,
        geometry: Dict[str, Any],
        start_date: date,
        end_date: date
    ) -> Optional[Dict[str, str]]:
        """
        Get GEE MapID for visualizing SAR flood extent.

        Args:
            geometry: GeoJSON geometry
            start_date: Start date
            end_date: End date

        Returns:
            Dict with 'url' (tile template) and 'token'
        """
        if not self._authenticated:
            if not self.authenticate():
                return None

        try:
            ee = self._ee
            aoi = ee.Geometry(geometry)

            # 1. Define Collections (Same as get_sar_flood_extent)
            collection = ee.ImageCollection('COPERNICUS/S1_GRD') \
                .filter(ee.Filter.eq('instrumentMode', 'IW')) \
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH')) \
                .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING')) \
                .filterBounds(aoi) \
                .select(['VH'])

            after_collection = collection.filterDate(start_date.isoformat(), end_date.isoformat())
            
            # Before Flood: 30 days prior
            before_start = start_date - timedelta(days=30)
            before_collection = collection.filterDate(before_start.isoformat(), start_date.isoformat())

            if after_collection.size().getInfo() == 0 or before_collection.size().getInfo() == 0:
                return None

            before = before_collection.mosaic().clip(aoi)
            after = after_collection.mosaic().clip(aoi)

            # Preprocessing
            smoothing_radius = 50
            before_filtered = before.focal_mean(smoothing_radius, 'circle', 'meters')
            after_filtered = after.focal_mean(smoothing_radius, 'circle', 'meters')

            # Change Detection & Thresholding
            water_threshold = -18.0
            water_mask = after_filtered.lt(water_threshold)
            
            # Mask the water layer so only water pixels are visible (0 is transparent)
            water_layer = water_mask.selfMask()

            # Visualization parameters
            vis_params = {
                'min': 0,
                'max': 1,
                'palette': ['0000FF'] # Pure Blue
            }

            # Get MapID
            map_id = water_layer.getMapId(vis_params)
            
            return {
                "url": map_id['tile_fetcher'].url_format,
                "token": map_id['mapid'] # Not strictly needed with url_format usually
            }

        except Exception as e:
            logger.error(f"Error generating MapID: {e}")
            return None

    def get_sar_flood_extent(
        self,
        geometry: Dict[str, Any],
        start_date: date,
        end_date: date
    ) -> Optional[Dict[str, float]]:
        """
        Calculate flood extent using Sentinel-1 SAR imagery (UN-SPIDER Methodology).
        More robust than NDWI during cloudy/rainy seasons.

        Args:
            geometry: GeoJSON geometry for area of interest
            start_date: Start date for "After Flood" image
            end_date: End date for "After Flood" image

        Returns:
            Dict with flood_extent_pct, water_pixels, total_pixels
        """
        if not self._authenticated:
            if not self.authenticate():
                return None

        try:
            ee = self._ee
            aoi = ee.Geometry(geometry)

            # 1. Define Collections
            # Use 'VH' polarization as recommended for flood mapping
            collection = ee.ImageCollection('COPERNICUS/S1_GRD') \
                .filter(ee.Filter.eq('instrumentMode', 'IW')) \
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH')) \
                .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING')) \
                .filterBounds(aoi) \
                .select(['VH'])

            # 2. Select Images
            # After Flood: The requested period
            after_collection = collection.filterDate(start_date.isoformat(), end_date.isoformat())
            
            # Before Flood: Baseline (Reference). Ideally same season from previous year or pre-event.
            # For simplicity, we assume 'Before' is 30 days prior to start_date.
            before_start = start_date - timedelta(days=30)
            before_collection = collection.filterDate(before_start.isoformat(), start_date.isoformat())

            if after_collection.size().getInfo() == 0 or before_collection.size().getInfo() == 0:
                logger.warning("Insufficient SAR data for flood analysis")
                return None

            # Mosaic and Clip
            before = before_collection.mosaic().clip(aoi)
            after = after_collection.mosaic().clip(aoi)

            # 3. Preprocessing (Speckle Filtering)
            # Apply a smoothing filter (Boxcar 50m radius) to reduce noise
            smoothing_radius = 50
            before_filtered = before.focal_mean(smoothing_radius, 'circle', 'meters')
            after_filtered = after.focal_mean(smoothing_radius, 'circle', 'meters')

            # 4. Change Detection
            # Calculate difference (Before / After ratio in dB scale is roughly subtraction)
            # Threshold: > 1.25 typically indicates water appearance (specular reflection loss)
            difference = after_filtered.divide(before_filtered)
            
            # Identify flood pixels (threshold tuning might be needed based on local terrain)
            # Standard heuristic: Values significantly lower in 'after' (darker) indicate water
            # But 'difference' ratio calculation depends on scale.
            # Using simple threshold on the 'After' image for water detection is also common:
            # Water in SAR VH is typically < -20dB.
            
            # Let's use the standard thresholding approach on the 'After' image first
            # as it's more robust than simple difference without calibration.
            water_threshold = -18.0  # dB value
            water_mask = after_filtered.lt(water_threshold)

            # 5. Calculate Stats
            stats = water_mask.reduceRegion(
                reducer=ee.Reducer.mean(), # Percentage of pixels marked as 1 (water)
                geometry=aoi,
                scale=30, # Sentinel-1 resolution
                maxPixels=1e9
            ).getInfo()

            return {
                "flood_extent_pct": (stats.get("VH", 0) or 0) * 100
            }

        except Exception as e:
            logger.error(f"Error calculating SAR flood extent: {e}")
            return None

    def get_land_surface_temperature(
        self,
        geometry: Dict[str, Any],
        start_date: date,
        end_date: date
    ) -> Optional[Dict[str, float]]:
        """
        Get MODIS Land Surface Temperature.

        Args:
            geometry: GeoJSON geometry for area of interest
            start_date: Start date for imagery
            end_date: End date for imagery

        Returns:
            Dict with lst_day, lst_night (in Celsius)
        """
        if not self._authenticated:
            if not self.authenticate():
                return None

        try:
            ee = self._ee

            aoi = ee.Geometry(geometry)

            # Get MODIS LST
            modis = ee.ImageCollection("MODIS/061/MOD11A2") \
                .filterBounds(aoi) \
                .filterDate(start_date.isoformat(), end_date.isoformat())

            size_info = modis.size().getInfo()
            if size_info == 0:
                return None

            # Scale factor for MODIS LST (Kelvin * 0.02 to get actual Kelvin, then convert to Celsius)
            def convert_to_celsius(image):
                lst_day = image.select('LST_Day_1km').multiply(0.02).subtract(273.15).rename('LST_Day_C')
                lst_night = image.select('LST_Night_1km').multiply(0.02).subtract(273.15).rename('LST_Night_C')
                return image.addBands([lst_day, lst_night])

            modis_celsius = modis.map(convert_to_celsius)

            # Get mean values
            stats = modis_celsius.select(['LST_Day_C', 'LST_Night_C']).mean().reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=aoi,
                scale=1000,
                maxPixels=1e9
            ).getInfo()

            return {
                "lst_day": stats.get("LST_Day_C"),
                "lst_night": stats.get("LST_Night_C")
            }

        except TimeoutError:
            logger.error("Timeout while fetching LST data from GEE")
            return None
        except Exception as e:
            logger.error(f"Error getting LST: {e}")
            return None

    def fetch_data_for_lga(
        self,
        lga_id: int,
        start_date: date,
        end_date: date
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch all GEE data for an LGA and save to database.

        Args:
            lga_id: ID of the LGA
            start_date: Start date
            end_date: End date

        Returns:
            Dict with fetched data or None
        """
        from app.database import SessionLocal
        from app.models import LGA, EnvironmentalData
        import json

        db = SessionLocal()
        try:
            # Get LGA geometry
            lga = db.query(LGA).filter(LGA.id == lga_id).first()

            if not lga or not lga.geometry_json:
                logger.warning(f"LGA {lga_id} not found or has no geometry")
                return None

            try:
                geometry = json.loads(lga.geometry_json)
            except json.JSONDecodeError:
                logger.error(f"Invalid geometry JSON for LGA {lga_id}")
                return None

            # Fetch flood index (Sentinel-2 Optical)
            flood_data = self.get_flood_index(geometry, start_date, end_date)
            
            # Fetch SAR flood extent (Sentinel-1 Radar)
            sar_data = self.get_sar_flood_extent(geometry, start_date, end_date)

            # Prioritize SAR for flood extent if available (sees through clouds)
            flood_pct = 0.0
            if sar_data:
                flood_pct = sar_data.get("flood_extent_pct", 0)
            elif flood_data:
                flood_pct = flood_data.get("flood_extent_pct", 0)

            # Fetch temperature
            lst_data = self.get_land_surface_temperature(geometry, start_date, end_date)

            # Save to database
            env_data = EnvironmentalData(
                lga_id=lga_id,
                observation_date=end_date,
                ndwi=flood_data.get("ndwi_mean") if flood_data else None,
                flood_extent_pct=flood_pct,
                flood_observed=flood_pct > 10,  # Threshold for "Flood Observed" status
                lst_day=lst_data.get("lst_day") if lst_data else None,
                lst_night=lst_data.get("lst_night") if lst_data else None,
                data_source="GEE-S1" if sar_data else "GEE-S2"
            )

            db.add(env_data)
            db.commit()

            return {
                "lga_id": lga_id,
                "observation_date": end_date.isoformat(),
                "flood_data": flood_data,
                "sar_data": sar_data,
                "lst_data": lst_data
            }

        except Exception as e:
            logger.error(f"Error fetching GEE data for LGA {lga_id}: {e}")
            db.rollback()
            return None
        finally:
            db.close()
