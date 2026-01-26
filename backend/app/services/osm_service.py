"""OpenStreetMap integration for health facilities."""
import logging
import requests
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import HealthFacility, LGA

logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

class OSMService:
    """Fetch data from OpenStreetMap."""
    
    def __init__(self, db: Session):
        self.db = db

    def fetch_health_facilities(self, state_name: str = "Cross River"):
        """
        Fetch health facilities (hospitals, clinics) from OSM for a given state.
        Updates the database.
        """
        # Query: Hospitals/Clinics in Cross River State
        query = f"""
        [out:json][timeout:25];
        area["name"="{state_name}"]->.searchArea;
        (
          node["amenity"="hospital"](area.searchArea);
          way["amenity"="hospital"](area.searchArea);
          node["amenity"="clinic"](area.searchArea);
          way["amenity"="clinic"](area.searchArea);
          node["healthcare"="centre"](area.searchArea);
        );
        out center;
        """
        
        try:
            response = requests.post(OVERPASS_URL, data={"data": query}, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            elements = data.get("elements", [])
            logger.info(f"Fetched {len(elements)} facilities from OSM")
            
            count = 0
            for el in elements:
                tags = el.get("tags", {})
                name = tags.get("name")
                if not name:
                    continue
                    
                lat = el.get("lat") or el.get("center", {}).get("lat")
                lon = el.get("lon") or el.get("center", {}).get("lon")
                
                if not lat or not lon:
                    continue
                    
                # Find LGA (Spatial Join - simple bounding box approximation or closest centroid)
                # For demo, we might need a robust spatial join if PostGIS is enabled.
                # Assuming lga_id can be mapped later or via spatial query.
                # Here we will try to find nearest LGA centroid if we don't have full polygon intersection logic readily available in python without shapely/geopandas dependency.
                # Note: The DB now has PostGIS geometry columns for spatial queries.
                
                facility_type = tags.get("amenity") or tags.get("healthcare")
                
                # Check existence
                existing = self.db.query(HealthFacility).filter(HealthFacility.name == name).first()
                if not existing:
                    facility = HealthFacility(
                        name=name,
                        type=facility_type,
                        latitude=lat,
                        longitude=lon,
                        # lga_id will be assigned by spatial join in a separate step or improved query
                    )
                    self.db.add(facility)
                    count += 1
            
            self.db.commit()
            return count
            
        except Exception as e:
            logger.error(f"OSM Fetch Error: {e}")
            return 0

    def assign_facilities_to_lgas(self):
        """
        Assigns imported facilities to LGAs based on coordinates.
        This is a simplified distance check for the demo.
        """
        from math import radians, cos, sin, asin, sqrt

        def haversine(lon1, lat1, lon2, lat2):
            """Calculate distance between two points in km."""
            lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
            dlon = lon2 - lon1
            dlat = lat2 - lat1
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            r = 6371
            return c * r

        facilities = self.db.query(HealthFacility).filter(HealthFacility.lga_id.is_(None)).all()
        lgas = self.db.query(LGA).all()
        
        updated = 0
        for fac in facilities:
            closest_lga = None
            min_dist = float('inf')
            
            for lga in lgas:
                if lga.centroid_lat and lga.centroid_lon:
                    dist = haversine(fac.longitude, fac.latitude, lga.centroid_lon, lga.centroid_lat)
                    if dist < min_dist:
                        min_dist = dist
                        closest_lga = lga
            
            # If reasonably close (e.g. within 50km of centroid), assign
            # Note: This is a rough approximation. Point-in-Polygon is better but requires shapely.
            if closest_lga and min_dist <= 50:
                fac.lga_id = closest_lga.id
                updated += 1
        
        self.db.commit()
        return updated
