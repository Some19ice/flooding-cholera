"""Health facility endpoints."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping

from app.database import get_db
from app.models import HealthFacility
from app.services.osm_service import OSMService

router = APIRouter(prefix="/api/facilities", tags=["Facilities"])

@router.get("/")
def get_facilities(db: Session = Depends(get_db)):
    """Get all health facilities."""
    return db.query(HealthFacility).all()

@router.get("/geojson")
def get_facilities_geojson(db: Session = Depends(get_db)):
    """
    Build a GeoJSON FeatureCollection of all health facilities.
    
    Each facility becomes a GeoJSON Feature whose geometry is taken from the facility's PostGIS `location` when available and convertible; if that is unavailable or conversion fails, geometry is constructed from `longitude` and `latitude`. Facilities lacking both a usable `location` and valid latitude/longitude are omitted.
    
    Returns:
        dict: A GeoJSON FeatureCollection with a "features" list. Each feature is a dict with keys "type" ("Feature"), "geometry" (GeoJSON geometry), and "properties" containing `id`, `name`, `type`, and `lga_id`.
    """
    facilities = db.query(HealthFacility).all()

    features = []
    for fac in facilities:
        # Try to use PostGIS location geometry first
        geometry = None
        if fac.location is not None:
            try:
                geometry = mapping(to_shape(fac.location))
            except Exception:
                pass

        # Fall back to lat/lon if no PostGIS geometry
        if geometry is None:
            if fac.latitude is None or fac.longitude is None:
                continue
            geometry = {
                "type": "Point",
                "coordinates": [fac.longitude, fac.latitude]
            }

        features.append({
            "type": "Feature",
            "geometry": geometry,
            "properties": {
                "id": fac.id,
                "name": fac.name,
                "type": fac.type,
                "lga_id": fac.lga_id
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

@router.post("/fetch-osm")
async def fetch_osm_data(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Trigger background fetch of health facilities from OpenStreetMap."""
    def task():
        # Re-instantiate session for background task
        from app.database import SessionLocal
        db_bg = SessionLocal()
        svc = OSMService(db_bg)
        try:
            svc.fetch_health_facilities()
            svc.assign_facilities_to_lgas()
        finally:
            db_bg.close()

    background_tasks.add_task(task)
    return {"message": "OSM fetch started in background"}