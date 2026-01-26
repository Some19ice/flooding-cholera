"""Google Earth Engine integration service."""
import os
import json
import logging
from datetime import date, timedelta
from typing import Optional, Dict, Any, List

from google.oauth2.service_account import Credentials

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
        """
        Return whether Google Earth Engine credentials are configured.
        
        Returns:
            bool: True if a JSON service account is provided or both a service account email and an existing private key file path are set, False otherwise.
        """
        if settings.gee_service_account_json:
            return True

        return bool(
            settings.gee_service_account_email and
            settings.gee_private_key_path and
            os.path.exists(settings.gee_private_key_path or "")
        )

    def is_authenticated(self) -> bool:
        """Check if authenticated with GEE."""
        return self._authenticated

    def authenticate(self) -> bool:
        """
        Initialize and authenticate the Google Earth Engine client using configured credentials.
        
        Prefers a JSON service account provided via settings.gee_service_account_json; if not present, uses the legacy service account email and private key path from settings. Sets the service as authenticated and stores the ee module reference on success.
        
        Returns:
            bool: `True` if authentication succeeded, `False` otherwise.
        """
        if not self.is_configured():
            logger.warning("GEE credentials not configured")
            return False

        try:
            import ee

            if settings.gee_service_account_json:
                try:
                    service_account_info = json.loads(settings.gee_service_account_json)
                    credentials = Credentials.from_service_account_info(
                        service_account_info,
                        scopes=['https://www.googleapis.com/auth/earthengine']
                    )
                    ee.Initialize(credentials=credentials)
                    self._authenticated = True
                    self._ee = ee
                    logger.info("Successfully authenticated with Google Earth Engine using JSON env var")
                    return True
                except json.JSONDecodeError:
                    logger.error("Failed to parse GEE_SERVICE_ACCOUNT_JSON")
                    return False
                except Exception as e:
                    logger.error(f"Error authenticating with JSON env var: {e}")
                    # Fall through to try file path if JSON fails? No, probably better to fail explicitly if JSON provided but bad.
                    return False

            # Legacy file path authentication
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
        Return a Google Earth Engine tile URL template and map identifier for visualizing SAR-derived flood extent detected by change detection.
        
        Parameters:
        	geometry (Dict[str, Any]): GeoJSON geometry defining the area of interest.
        	start_date (date): Start date of the analysis period.
        	end_date (date): End date of the analysis period.
        
        Returns:
        	result (Dict[str, str] | None): Dictionary with 'url' (tile URL template) and 'token' (map id) if a MapID was generated, `None` otherwise.
        """
        if not self._authenticated:
            if not self.authenticate():
                return None

        try:
            ee = self._ee
            aoi = ee.Geometry(geometry)

            # 1. Define Collections
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

            # Preprocessing (Speckle Filtering)
            smoothing_radius = 50
            before_filtered = before.focal_mean(smoothing_radius, 'circle', 'meters')
            after_filtered = after.focal_mean(smoothing_radius, 'circle', 'meters')

            # Change Detection
            # Note: Sentinel-1 GRD data is already in dB scale, so we compute difference directly
            # Flooded areas show significant decrease in backscatter (negative difference)
            difference = after_filtered.subtract(before_filtered)

            # Thresholding for change detection
            # A drop of > 3dB typically indicates water appearance
            change_threshold = -3.0
            water_mask = difference.lt(change_threshold)

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

    def get_sar_flood_thumbnail(
        self,
        geometry: Dict[str, Any],
        start_date: date,
        end_date: date
    ) -> Optional[str]:
        """
        Generate a static thumbnail URL visualizing SAR change detection with detected water overlaid in blue.
        
        Parameters:
            geometry (Dict[str, Any]): GeoJSON geometry defining the area of interest.
            start_date (date): Start date for the "after" SAR period.
            end_date (date): End date for the "after" SAR period.
        
        Returns:
            str or None: URL of the generated PNG thumbnail, or `None` if generation fails or data are unavailable.
        """
        if not self._authenticated:
            if not self.authenticate():
                return None

        try:
            ee = self._ee
            aoi = ee.Geometry(geometry)

            # 1. Define Collections
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

            # Preprocessing (Speckle Filtering)
            smoothing_radius = 50
            before_filtered = before.focal_mean(smoothing_radius, 'circle', 'meters')
            after_filtered = after.focal_mean(smoothing_radius, 'circle', 'meters')

            # Change Detection
            difference = after_filtered.subtract(before_filtered)
            change_threshold = -3.0
            water_mask = difference.lt(change_threshold)

            # Create Visualization
            # Background: 'After' image (SAR backscatter)
            # VH backscatter typically ranges from -30 to 0 dB
            bg_vis = after_filtered.visualize(min=-25, max=0, palette=['black', 'white'])

            # Overlay: Detected Water (Blue)
            water_vis = water_mask.selfMask().visualize(palette=['0000FF'])

            # Composite
            composite = bg_vis.blend(water_vis)

            # Generate URL
            url = composite.getThumbURL({
                'dimensions': 400,
                'region': aoi,
                'format': 'png'
            })

            return url

        except Exception as e:
            logger.error(f"Error generating thumbnail: {e}")
            return None

    def get_sar_flood_extent(
        self,
        geometry: Dict[str, Any],
        start_date: date,
        end_date: date
    ) -> Optional[Dict[str, float]]:
        """
        Estimate flood extent within a GeoJSON area using Sentinel-1 SAR change detection.
        
        Parameters:
            geometry (dict): GeoJSON geometry describing the area of interest.
            start_date (date): Start date for the "after" period used in change detection.
            end_date (date): End date for the "after" period used in change detection.
        
        Returns:
            dict: Dictionary with key `flood_extent_pct` (float) representing the percentage of the area detected as water.
            Returns `None` on failure or when insufficient data is available.
        """
        if not self._authenticated:
            if not self.authenticate():
                return None

        try:
            ee = self._ee
            aoi = ee.Geometry(geometry)

            # 1. Define Collections
            collection = ee.ImageCollection('COPERNICUS/S1_GRD') \
                .filter(ee.Filter.eq('instrumentMode', 'IW')) \
                .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH')) \
                .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING')) \
                .filterBounds(aoi) \
                .select(['VH'])

            # 2. Select Images
            after_collection = collection.filterDate(start_date.isoformat(), end_date.isoformat())

            before_start = start_date - timedelta(days=30)
            before_collection = collection.filterDate(before_start.isoformat(), start_date.isoformat())

            if after_collection.size().getInfo() == 0 or before_collection.size().getInfo() == 0:
                logger.warning("Insufficient SAR data for flood analysis")
                return None

            # Mosaic and Clip
            before = before_collection.mosaic().clip(aoi)
            after = after_collection.mosaic().clip(aoi)

            # 3. Preprocessing (Speckle Filtering)
            smoothing_radius = 50
            before_filtered = before.focal_mean(smoothing_radius, 'circle', 'meters')
            after_filtered = after.focal_mean(smoothing_radius, 'circle', 'meters')

            # 4. Change Detection
            # Note: Sentinel-1 GRD data is already in dB scale, so we compute difference directly
            difference = after_filtered.subtract(before_filtered)

            # Thresholding: Significant drop in backscatter (< -3dB)
            change_threshold = -3.0
            water_mask = difference.lt(change_threshold)

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
        Fetches Earth Engine products for a Local Government Area (LGA), persists an EnvironmentalData record, and returns the collected values.
        
        Persists a new EnvironmentalData row using the provided date range (recorded with observation_date equal to end_date). Uses SAR-derived extent when available, otherwise optical NDWI for flood extent determination.
        
        Parameters:
            lga_id (int): Primary key of the LGA to query.
            start_date (date): Start of the observation window.
            end_date (date): End of the observation window; also used as the persisted observation_date.
        
        Returns:
            dict: {
                "lga_id": int,
                "observation_date": str,  # ISO formatted end_date
                "flood_data": Optional[Dict[str, float]],  # NDWI stats or None
                "sar_data": Optional[Dict[str, float]],    # SAR flood extent stats or None
                "lst_data": Optional[Dict[str, float]]     # Land surface temperature stats or None
            }
            or None if the operation fails or the LGA/geometry is invalid.
        """
        from app.database import SessionLocal
        from app.models import LGA, EnvironmentalData
        from geoalchemy2.shape import to_shape
        from shapely.geometry import mapping

        db = SessionLocal()
        try:
            # Get LGA geometry
            lga = db.query(LGA).filter(LGA.id == lga_id).first()

            if not lga or lga.geometry is None:
                logger.warning(f"LGA {lga_id} not found or has no geometry")
                return None

            try:
                geometry = mapping(to_shape(lga.geometry))
            except Exception:
                logger.error(f"Invalid geometry for LGA {lga_id}")
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