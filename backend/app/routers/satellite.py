"""Satellite data endpoints."""
import logging
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape
from geoalchemy2.exc import ArgumentError
from shapely.geometry import mapping
from shapely.errors import ShapelyError

from app.database import get_db
from app.models import LGA, EnvironmentalData
from app.services.earth_engine import EarthEngineService
from app.services.nasa_gpm import NASAGPMService
from app.rate_limiter import limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/satellite", tags=["Satellite"])


@router.get("/tiles/flood/{lga_id}")
@limiter.limit("30/minute")
def get_flood_tiles(
    request: Request,
    lga_id: int,
    date_str: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db)
):
    """
    Get GEE MapID for visualizing SAR flood extent.

    Args:
        request: The FastAPI request object.
        lga_id: The ID of the LGA to analyze.
        date_str: Optional target date (ISO format). Defaults to today.
        db: Database session.

    Returns:
        Dict containing 'url' (tile template) and 'token'.

    Raises:
        HTTPException: If GEE is not configured, LGA not found, or no data available.
    """
    gee_service = EarthEngineService()

    if not gee_service.is_configured():
        raise HTTPException(status_code=503, detail="GEE not configured")

    lga = db.query(LGA).filter(LGA.id == lga_id).first()
    if not lga or lga.geometry is None:
        raise HTTPException(status_code=404, detail="LGA or geometry not found")

    try:
        geometry = mapping(to_shape(lga.geometry))
    except (ShapelyError, ArgumentError, ValueError) as err:
        logger.exception("Invalid LGA geometry", extra={"lga_id": lga_id})
        raise HTTPException(status_code=500, detail="Invalid LGA geometry") from err

    # Determine date range
    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        target_date = date.today()

    # Window: 12 days (Sentinel-1 revisit is 6-12 days)
    # We look back 12 days from target_date to find an image
    start_date = target_date - timedelta(days=12)
    end_date = target_date

    map_data = gee_service.get_sar_flood_mapid(geometry, start_date, end_date)

    if not map_data:
        raise HTTPException(status_code=404, detail="No SAR data found for this period")

    return map_data


@router.get("/thumbnail/{lga_id}")
@limiter.limit("30/minute")
def get_satellite_thumbnail(
    request: Request,
    lga_id: int,
    date_str: Optional[str] = Query(None, alias="date"),
    db: Session = Depends(get_db)
):
    """
    Get a static thumbnail URL for satellite imagery of an LGA.
    """
    gee_service = EarthEngineService()

    if not gee_service.is_configured():
        raise HTTPException(status_code=503, detail="GEE not configured")

    lga = db.query(LGA).filter(LGA.id == lga_id).first()
    if not lga or lga.geometry is None:
        raise HTTPException(status_code=404, detail="LGA or geometry not found")

    try:
        geometry = mapping(to_shape(lga.geometry))
    except (ShapelyError, ArgumentError, ValueError) as err:
        logger.exception("Invalid LGA geometry", extra={"lga_id": lga_id})
        raise HTTPException(status_code=500, detail="Invalid LGA geometry") from err

    # Determine date range
    if date_str:
        try:
            target_date = date.fromisoformat(date_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        target_date = date.today()

    # Window: 12 days
    start_date = target_date - timedelta(days=12)
    end_date = target_date

    url = gee_service.get_sar_flood_thumbnail(geometry, start_date, end_date)

    if not url:
        raise HTTPException(status_code=404, detail="No imagery found for this period")

    return {"url": url}


@router.get("/status")
@limiter.limit("60/minute")
def get_satellite_status(request: Request):
    """Check status of satellite data services."""
    gee_service = EarthEngineService()
    nasa_service = NASAGPMService()

    return {
        "google_earth_engine": {
            "configured": gee_service.is_configured(),
            "authenticated": gee_service.is_authenticated()
        },
        "nasa_gpm": {
            "configured": nasa_service.is_configured(),
            "authenticated": nasa_service.is_authenticated()
        }
    }


@router.get("/latest")
@limiter.limit("60/minute")
def get_latest_satellite_data(
    request: Request,
    lga_id: Optional[int] = None,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    db: Session = Depends(get_db)
):
    """Get latest satellite data for LGAs with pagination."""
    query = db.query(EnvironmentalData)

    if lga_id:
        query = query.filter(EnvironmentalData.lga_id == lga_id)

    # Get latest data for each LGA
    from sqlalchemy import func
    subquery = (
        db.query(
            EnvironmentalData.lga_id,
            func.max(EnvironmentalData.observation_date).label("max_date")
        )
        .group_by(EnvironmentalData.lga_id)
        .subquery()
    )

    latest = (
        db.query(EnvironmentalData, LGA.name)
        .join(LGA)
        .join(
            subquery,
            (EnvironmentalData.lga_id == subquery.c.lga_id) &
            (EnvironmentalData.observation_date == subquery.c.max_date)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        {
            "lga_id": env.lga_id,
            "lga_name": lga_name,
            "observation_date": env.observation_date.isoformat(),
            "rainfall_mm": env.rainfall_mm,
            "rainfall_7day_mm": env.rainfall_7day_mm,
            "ndwi": env.ndwi,
            "flood_extent_pct": env.flood_extent_pct,
            "flood_observed": env.flood_observed,
            "lst_day": env.lst_day,
            "data_source": env.data_source
        }
        for env, lga_name in latest
    ]


@router.post("/fetch")
@limiter.limit("5/minute")
async def fetch_satellite_data(
    request: Request,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    lga_id: Optional[int] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Trigger fetching of satellite data from external sources."""
    if not start_date:
        start_date = date.today() - timedelta(days=7)
    if not end_date:
        end_date = date.today()

    # Get LGAs to process
    if lga_id:
        lgas = db.query(LGA).filter(LGA.id == lga_id).all()
    else:
        lgas = db.query(LGA).all()

    if not lgas:
        raise HTTPException(status_code=404, detail="No LGAs found")

    # Queue background fetch
    if background_tasks:
        background_tasks.add_task(
            fetch_data_for_lgas,
            [lga.id for lga in lgas],
            start_date,
            end_date
        )
        return {
            "success": True,
            "message": f"Queued satellite data fetch for {len(lgas)} LGAs",
            "date_range": f"{start_date} to {end_date}"
        }
    else:
        # Run synchronously (for testing)
        return {
            "success": True,
            "message": "Satellite data fetch would be triggered here",
            "note": "Configure GEE and NASA credentials to enable actual data fetch"
        }


async def fetch_data_for_lgas(lga_ids: list, start_date: date, end_date: date):
    """Background task to fetch satellite data for specified LGAs."""
    gee_service = EarthEngineService()
    nasa_service = NASAGPMService()

    for lga_id in lga_ids:
        try:
            # Fetch GEE data (flood, NDWI, temperature)
            if gee_service.is_authenticated():
                gee_service.fetch_data_for_lga(lga_id, start_date, end_date)

            # Fetch NASA GPM data (rainfall)
            if nasa_service.is_authenticated():
                nasa_service.fetch_data_for_lga(lga_id, start_date, end_date)

        except Exception as e:
            logger.error(f"Error fetching data for LGA {lga_id}: {e}")
            continue


@router.get("/historical/{lga_id}")
@limiter.limit("60/minute")
def get_historical_environmental_data(
    request: Request,
    lga_id: int,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(365, ge=1, le=1000, description="Maximum number of records to return"),
    db: Session = Depends(get_db)
):
    """Get historical environmental data for an LGA with pagination."""
    lga = db.query(LGA).filter(LGA.id == lga_id).first()
    if not lga:
        raise HTTPException(status_code=404, detail="LGA not found")

    if not start_date:
        start_date = date.today() - timedelta(days=90)
    if not end_date:
        end_date = date.today()

    query = (
        db.query(EnvironmentalData)
        .filter(
            EnvironmentalData.lga_id == lga_id,
            EnvironmentalData.observation_date >= start_date,
            EnvironmentalData.observation_date <= end_date
        )
        .order_by(EnvironmentalData.observation_date)
    )

    total = query.count()
    data = query.offset(skip).limit(limit).all()

    return {
        "lga_id": lga_id,
        "lga_name": lga.name,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total": total,
        "skip": skip,
        "limit": limit,
        "data_points": len(data),
        "data": [
            {
                "date": d.observation_date.isoformat(),
                "rainfall_mm": d.rainfall_mm,
                "rainfall_7day_mm": d.rainfall_7day_mm,
                "ndwi": d.ndwi,
                "flood_observed": d.flood_observed,
                "lst_day": d.lst_day,
                "lst_night": d.lst_night
            }
            for d in data
        ]
    }
