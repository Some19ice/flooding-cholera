"""
Database seeding script for Cross River State cholera surveillance system.

This script:
1. Creates all database tables
2. Imports LGA boundaries from GeoJSON
3. Generates compelling demo data with realistic outbreak scenario
4. Calculates initial risk scores
5. Seeds demo alerts

Usage:
    cd backend
    python -m app.seed_database
"""
import json
import os
import sys
from datetime import date, timedelta, datetime
import random

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from geoalchemy2.shape import from_shape
from shapely.geometry import shape, MultiPolygon

from app.database import engine, SessionLocal, Base, init_db
from app.models import LGA, CaseReport, EnvironmentalData, RiskScore, Alert
from app.services.risk_calculator import RiskCalculator


def to_postgis_multipolygon(geometry: dict):
    """Convert GeoJSON geometry to PostGIS MultiPolygon format."""
    geom_shape = shape(geometry)
    if geom_shape.geom_type == 'Polygon':
        geom_shape = MultiPolygon([geom_shape])
    return from_shape(geom_shape, srid=4326)


def create_tables():
    """Create all database tables."""
    print("Creating database tables...")
    init_db()
    print("Tables created successfully.")


def load_lga_geojson():
    """Load LGA boundaries from GeoJSON file."""
    geojson_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "data",
        "cross_river_lgas.geojson"
    )

    if not os.path.exists(geojson_path):
        print(f"GeoJSON file not found at {geojson_path}")
        return None

    with open(geojson_path, "r") as f:
        return json.load(f)


def seed_lgas():
    """Seed LGA data from GeoJSON."""
    print("Seeding LGA data...")
    db = SessionLocal()

    try:
        geojson = load_lga_geojson()
        if not geojson:
            print("Could not load GeoJSON, using hardcoded LGA data...")
            seed_lgas_hardcoded(db)
            return

        for feature in geojson["features"]:
            props = feature["properties"]
            geometry = feature["geometry"]

            # Calculate centroid from geometry
            coords = geometry["coordinates"][0]
            if coords:
                lons = [c[0] for c in coords]
                lats = [c[1] for c in coords]
                centroid_lon = sum(lons) / len(lons)
                centroid_lat = sum(lats) / len(lats)
            else:
                centroid_lon = 8.5
                centroid_lat = 5.5

            # Check if LGA exists
            existing = db.query(LGA).filter(LGA.name == props["name"]).first()

            if existing:
                print(f"  LGA {props['name']} already exists, skipping...")
                continue

            # Convert GeoJSON geometry to PostGIS format (ensure MultiPolygon)
            # Convert GeoJSON geometry to PostGIS format (ensure MultiPolygon)
            postgis_geom = to_postgis_multipolygon(geometry)

            lga = LGA(
                name=props["name"],
                code=props["code"],
                population=props.get("population"),
                headquarters=props.get("headquarters"),
                centroid_lat=centroid_lat,
                centroid_lon=centroid_lon,
                water_coverage_pct=random.uniform(40, 80),
                sanitation_coverage_pct=random.uniform(35, 70),
                health_facilities_count=random.randint(3, 15),
                geometry=postgis_geom
            )

            db.add(lga)
            print(f"  Added LGA: {props['name']}")

        db.commit()
        print(f"Seeded {len(geojson['features'])} LGAs successfully.")

    except Exception as e:
        print(f"Error seeding LGAs: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def seed_lgas_hardcoded(db):
    """Fallback: seed LGAs with hardcoded data (no geometry)."""
    lgas_data = [
        ("Abi", "CRS-ABI", 173837, "Itigidi", 5.95, 8.15),
        ("Akamkpa", "CRS-AKA", 157928, "Akamkpa", 5.37, 8.45),
        ("Akpabuyo", "CRS-AKP", 310110, "Ikot Nakanda", 4.95, 8.42),
        ("Bakassi", "CRS-BAK", 32173, "Abana", 4.67, 8.62),
        ("Bekwarra", "CRS-BEK", 118700, "Abuochiche", 6.70, 8.90),
        ("Biase", "CRS-BIA", 178678, "Akpet Central", 5.70, 8.15),
        ("Boki", "CRS-BOK", 209837, "Boje", 6.05, 9.00),
        ("Calabar Municipal", "CRS-CAM", 183359, "Calabar", 4.97, 8.35),
        ("Calabar South", "CRS-CAS", 220000, "Anantigha", 4.91, 8.33),
        ("Etung", "CRS-ETU", 89113, "Effraya", 5.70, 8.85),
        ("Ikom", "CRS-IKO", 166032, "Ikom", 6.00, 8.75),
        ("Obanliku", "CRS-OBA", 123315, "Sankwala", 6.55, 9.25),
        ("Obubra", "CRS-OBU", 195893, "Obubra", 6.10, 8.37),
        ("Obudu", "CRS-OBD", 172773, "Obudu", 6.72, 9.20),
        ("Odukpani", "CRS-ODU", 193892, "Odukpani", 5.20, 8.25),
        ("Ogoja", "CRS-OGO", 173673, "Ogoja", 6.60, 8.80),
        ("Yakuur", "CRS-YAK", 200823, "Ugep", 5.85, 8.15),
        ("Yala", "CRS-YAL", 216118, "Okpoma", 6.45, 8.62),
    ]

    for name, code, pop, hq, lat, lon in lgas_data:
        existing = db.query(LGA).filter(LGA.name == name).first()
        if existing:
            continue

        # Create simple polygon geometry around centroid
        offset = 0.15
        geometry = {
            "type": "Polygon",
            "coordinates": [[
                [lon - offset, lat - offset],
                [lon + offset, lat - offset],
                [lon + offset, lat + offset],
                [lon - offset, lat + offset],
                [lon - offset, lat - offset]
            ]]
        }

        # Convert GeoJSON geometry to PostGIS format (ensure MultiPolygon)
        # Convert GeoJSON geometry to PostGIS format (ensure MultiPolygon)
        postgis_geom = to_postgis_multipolygon(geometry)

        lga = LGA(
            name=name,
            code=code,
            population=pop,
            headquarters=hq,
            centroid_lat=lat,
            centroid_lon=lon,
            water_coverage_pct=random.uniform(40, 80),
            sanitation_coverage_pct=random.uniform(35, 70),
            health_facilities_count=random.randint(3, 15),
            geometry=postgis_geom
        )
        db.add(lga)
        print(f"  Added LGA: {name}")

    db.commit()


def seed_demo_scenario():
    """
    Create a compelling demo scenario:
    - Heavy rain 4 weeks ago
    - Flooding detected 3 weeks ago in Calabar South and Odukpani
    - First cases 3 weeks ago
    - Outbreak peaks 4 days ago (within 14-day risk window)
    - Intervention showing effect (cases declining slightly)
    """
    print("Seeding demo scenario data...")
    db = SessionLocal()

    try:
        lgas = db.query(LGA).all()
        if not lgas:
            print("No LGAs found. Please seed LGAs first.")
            return

        # Create LGA lookup
        lga_dict = {lga.name: lga for lga in lgas}

        # Define outbreak epicenters
        epicenter_lgas = ["Calabar South", "Odukpani"]

        # Define neighboring LGAs with moderate risk
        neighbor_lgas = ["Calabar Municipal", "Akpabuyo", "Akamkpa", "Biase"]

        # Reference dates for the scenario
        today = date.today()

        # Environmental data timeline
        print("  Creating environmental data...")
        seed_environmental_scenario(db, lgas, lga_dict, epicenter_lgas, neighbor_lgas, today)

        # Case data timeline
        print("  Creating cholera case data...")
        seed_case_scenario(db, lgas, lga_dict, epicenter_lgas, neighbor_lgas, today)

        db.commit()
        print("Demo scenario data created successfully.")

    except Exception as e:
        print(f"Error seeding demo scenario: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def seed_environmental_scenario(db, lgas, lga_dict, epicenter_lgas, neighbor_lgas, today):
    """Create environmental data for the demo scenario."""

    # Timeline
    heavy_rain_start = today - timedelta(days=28)  # 4 weeks ago
    heavy_rain_end = today - timedelta(days=24)
    flood_peak = today - timedelta(days=21)  # 3 weeks ago

    # Create data for past 60 days
    for days_ago in range(60, -1, -1):
        current_date = today - timedelta(days=days_ago)

        # Generate data for all days to ensure recent coverage
        # if current_date.day % 2 != 0:
        #     continue

        for lga in lgas:
            is_epicenter = lga.name in epicenter_lgas
            is_neighbor = lga.name in neighbor_lgas

            # Determine rainfall based on timeline
            if heavy_rain_start <= current_date <= heavy_rain_end:
                # Heavy rain event
                if is_epicenter:
                    rainfall_mm = random.uniform(35, 65)
                elif is_neighbor:
                    rainfall_mm = random.uniform(25, 45)
                else:
                    rainfall_mm = random.uniform(15, 35)
            elif current_date < heavy_rain_start:
                # Before rain event - normal
                rainfall_mm = random.uniform(0, 15)
            else:
                # After rain event - tapering off
                days_since_rain = (current_date - heavy_rain_end).days
                base_rain = max(0, 20 - days_since_rain * 0.8)
                rainfall_mm = random.uniform(0, base_rain)

            # Calculate cumulative rainfall
            # For demo, approximate 7-day and 30-day values
            rainfall_7day = rainfall_mm * random.uniform(4, 7)
            rainfall_30day = rainfall_mm * random.uniform(15, 25)

            # NDWI and flooding patterns
            if current_date >= flood_peak - timedelta(days=3) and current_date <= flood_peak + timedelta(days=14):
                # Peak flooding period (3 weeks ago to 1 week ago)
                if is_epicenter:
                    ndwi = random.uniform(0.45, 0.75)
                    flood_extent_pct = random.uniform(15, 35)
                    flood_observed = True
                elif is_neighbor:
                    ndwi = random.uniform(0.35, 0.55)
                    flood_extent_pct = random.uniform(8, 18)
                    flood_observed = random.random() > 0.3
                else:
                    ndwi = random.uniform(0.15, 0.35)
                    flood_extent_pct = random.uniform(0, 8)
                    flood_observed = random.random() > 0.8
            elif current_date > flood_peak + timedelta(days=14):
                # Flooding receding
                if is_epicenter:
                    # Keep flood indicators higher for epicenters
                    ndwi = random.uniform(0.35, 0.55)
                    flood_extent_pct = random.uniform(10, 22)
                    flood_observed = random.random() > 0.3
                elif is_neighbor:
                    ndwi = random.uniform(0.20, 0.40)
                    flood_extent_pct = random.uniform(4, 12)
                    flood_observed = random.random() > 0.6
                else:
                    ndwi = random.uniform(0.05, 0.25)
                    flood_extent_pct = random.uniform(0, 5)
                    flood_observed = False
            else:
                # Normal conditions
                ndwi = random.uniform(-0.1, 0.2)
                flood_extent_pct = random.uniform(0, 3)
                flood_observed = False

            # Temperature (relatively stable)
            lst_day = random.uniform(30, 34)
            lst_night = random.uniform(23, 26)

            # Check if record exists
            existing = db.query(EnvironmentalData).filter(
                EnvironmentalData.lga_id == lga.id,
                EnvironmentalData.observation_date == current_date
            ).first()

            if not existing:
                env_data = EnvironmentalData(
                    lga_id=lga.id,
                    observation_date=current_date,
                    rainfall_mm=round(rainfall_mm, 2),
                    rainfall_7day_mm=round(rainfall_7day, 2),
                    rainfall_30day_mm=round(rainfall_30day, 2),
                    ndwi=round(ndwi, 3),
                    flood_extent_pct=round(flood_extent_pct, 2),
                    flood_observed=flood_observed,
                    lst_day=round(lst_day, 2),
                    lst_night=round(lst_night, 2),
                    data_source="demo_scenario"
                )
                db.add(env_data)


def seed_case_scenario(db, lgas, lga_dict, epicenter_lgas, neighbor_lgas, today):
    """Create cholera case data for the demo scenario."""

    # Timeline - adjusted to have peak within 14-day risk window
    first_cases = today - timedelta(days=21)  # 3 weeks ago
    outbreak_peak = today - timedelta(days=4)  # 4 days ago (within 14-day window!)

    # Case fatality rate
    cfr = 0.015  # 1.5% CFR

    # Create case data
    for days_ago in range(40, -1, -1):
        current_date = today - timedelta(days=days_ago)

        # Skip some days randomly (not every day has reports)
        if current_date < first_cases and random.random() < 0.7:
            continue

        for lga in lgas:
            is_epicenter = lga.name in epicenter_lgas
            is_neighbor = lga.name in neighbor_lgas

            # Before outbreak - baseline/sporadic cases
            if current_date < first_cases:
                if is_epicenter and random.random() < 0.1:
                    new_cases = random.randint(0, 2)
                elif random.random() < 0.05:
                    new_cases = random.randint(0, 1)
                else:
                    continue
            # During outbreak buildup (first_cases to peak)
            elif current_date < outbreak_peak:
                days_into_outbreak = (current_date - first_cases).days
                days_to_peak = (outbreak_peak - first_cases).days

                # Growth curve - exponential-ish growth
                growth_factor = (days_into_outbreak / days_to_peak) ** 1.5

                if is_epicenter:
                    base_cases = 35  # Increased from 25
                    new_cases = int(base_cases * growth_factor * random.uniform(0.8, 1.4))
                    # Ensure at least some cases
                    new_cases = max(3, new_cases)
                elif is_neighbor:
                    base_cases = 15  # Increased from 10
                    new_cases = int(base_cases * growth_factor * random.uniform(0.7, 1.3))
                    if random.random() < 0.7:
                        new_cases = max(2, new_cases)
                    else:
                        new_cases = 0
                else:
                    # Low risk areas - occasional cases
                    if random.random() < 0.2:
                        new_cases = random.randint(0, 4)
                    else:
                        continue
            # Peak period (around outbreak_peak) - 4 days window
            elif current_date >= outbreak_peak and current_date < outbreak_peak + timedelta(days=4):
                if is_epicenter:
                    new_cases = random.randint(30, 45)  # Increased from 20-35
                elif is_neighbor:
                    new_cases = random.randint(12, 22)  # Increased from 8-16
                else:
                    if random.random() < 0.3:
                        new_cases = random.randint(1, 6)
                    else:
                        continue
            # Decline phase (after peak) - still high but declining
            else:
                days_since_peak = (current_date - outbreak_peak).days
                # Slower decline to keep cases high recently
                decline_factor = max(0.3, 1 - (days_since_peak / 20))

                if is_epicenter:
                    new_cases = int(35 * decline_factor * random.uniform(0.7, 1.2))
                    new_cases = max(5, new_cases)
                elif is_neighbor:
                    new_cases = int(18 * decline_factor * random.uniform(0.6, 1.1))
                    if random.random() < 0.7:
                        new_cases = max(2, new_cases)
                    else:
                        new_cases = 0
                else:
                    if random.random() < 0.15:
                        new_cases = random.randint(0, 3)
                    else:
                        continue

            if new_cases == 0:
                continue

            # Calculate deaths based on CFR with some randomness
            deaths = 0
            if new_cases > 0:
                expected_deaths = new_cases * cfr
                # Use Poisson-like distribution for deaths
                if expected_deaths > 0:
                    deaths = int(expected_deaths + random.uniform(-0.5, 0.5))
                    deaths = max(0, deaths)
                # Small chance of death even with low cases
                if deaths == 0 and new_cases > 5 and random.random() < 0.3:
                    deaths = 1

            # Confirmed vs suspected
            confirmed_cases = int(new_cases * random.uniform(0.6, 0.9))
            suspected_cases = new_cases - confirmed_cases

            # Check if record exists
            existing = db.query(CaseReport).filter(
                CaseReport.lga_id == lga.id,
                CaseReport.report_date == current_date
            ).first()

            if not existing:
                case_report = CaseReport(
                    lga_id=lga.id,
                    report_date=current_date,
                    new_cases=new_cases,
                    deaths=deaths,
                    suspected_cases=suspected_cases,
                    confirmed_cases=confirmed_cases,
                    source="demo_scenario"
                )
                db.add(case_report)


def seed_demo_alerts():
    """Seed demo alerts for demonstration."""
    print("Seeding demo alerts...")
    db = SessionLocal()

    try:
        lgas = db.query(LGA).all()
        if not lgas:
            print("No LGAs found. Please seed LGAs first.")
            return

        # Map LGA names to IDs for easy access
        lga_map = {lga.name: lga.id for lga in lgas}

        # Define realistic alerts
        alerts_data = [
            # Critical alerts (2)
            {
                "lga_id": lga_map.get("Calabar Municipal"),
                "level": "red",
                "severity": "critical",
                "type": "active_outbreak",
                "title": "Active Cholera Outbreak Detected",
                "message": "Confirmed cholera outbreak in Calabar Municipal with 45 new cases in the last 48 hours. Immediate intervention required. Water sources in affected wards should be chlorinated and community health workers deployed.",
                "triggered_by": {
                    "cases_48h": 45,
                    "deaths_48h": 3,
                    "threshold_exceeded": "critical_case_surge",
                    "wards_affected": ["Central Ward", "Ekpo Abasi"]
                },
                "created_at": datetime.utcnow() - timedelta(hours=12),
                "is_active": True
            },
            {
                "lga_id": lga_map.get("Odukpani"),
                "level": "red",
                "severity": "critical",
                "type": "flood_warning",
                "title": "Severe Flooding Detected",
                "message": "Satellite imagery shows extensive flooding covering 23% of Odukpani LGA. High risk of waterborne disease transmission. Emergency response teams should be mobilized for affected communities.",
                "triggered_by": {
                    "flood_extent_pct": 23.4,
                    "ndwi": 0.65,
                    "rainfall_7day_mm": 187.3,
                    "satellite_source": "Sentinel-1"
                },
                "created_at": datetime.utcnow() - timedelta(days=1),
                "is_active": True
            },
            # Warning alerts (3)
            {
                "lga_id": lga_map.get("Calabar South"),
                "level": "yellow",
                "severity": "warning",
                "type": "case_spike",
                "title": "Unusual Increase in Case Reports",
                "message": "Cholera cases in Calabar South have increased 150% over the past week (18 cases vs baseline of 7). Enhanced surveillance recommended. Consider deploying rapid response team.",
                "triggered_by": {
                    "current_weekly_cases": 18,
                    "baseline_weekly_cases": 7,
                    "percent_increase": 157,
                    "trend": "increasing"
                },
                "created_at": datetime.utcnow() - timedelta(days=2),
                "is_active": True
            },
            {
                "lga_id": lga_map.get("Akpabuyo"),
                "level": "yellow",
                "severity": "warning",
                "type": "rainfall_alert",
                "title": "Heavy Rainfall Warning",
                "message": "Cumulative rainfall of 142mm recorded in the past 7 days. Potential for flooding and contamination of water sources. Communities should be alerted to boil drinking water.",
                "triggered_by": {
                    "rainfall_7day_mm": 142.3,
                    "threshold": 100,
                    "forecast": "continued_rain_expected"
                },
                "created_at": datetime.utcnow() - timedelta(days=3),
                "is_active": True,
                "acknowledged_at": datetime.utcnow() - timedelta(days=2, hours=6),
                "acknowledged_by": 1
            },
            {
                "lga_id": lga_map.get("Biase"),
                "level": "yellow",
                "severity": "warning",
                "type": "water_quality",
                "title": "Water Quality Alert",
                "message": "Recent environmental data indicates increased flood extent (8.2%) near major water sources in Biase. Recommend water quality testing and community health education on safe water practices.",
                "triggered_by": {
                    "flood_extent_pct": 8.2,
                    "water_sources_affected": 5,
                    "ndwi_change": 0.12
                },
                "created_at": datetime.utcnow() - timedelta(days=4),
                "is_active": True
            },
            # Info alerts (2)
            {
                "lga_id": None,  # State-wide
                "level": "green",
                "severity": "info",
                "type": "surveillance_update",
                "title": "Weekly Surveillance Report Available",
                "message": "The weekly cholera surveillance report for Cross River State is now available. Total cases this week: 87 across 12 LGAs. Case fatality rate: 2.3%. Trend is stable compared to previous week.",
                "triggered_by": {
                    "report_type": "weekly_summary",
                    "total_cases": 87,
                    "lgas_affected": 12,
                    "cfr": 2.3
                },
                "created_at": datetime.utcnow() - timedelta(days=2),
                "is_active": True,
                "acknowledged_at": datetime.utcnow() - timedelta(days=1),
                "acknowledged_by": 1
            },
            {
                "lga_id": lga_map.get("Ikom"),
                "level": "green",
                "severity": "info",
                "type": "risk_assessment_update",
                "title": "Risk Level Update - Ikom",
                "message": "Risk assessment for Ikom LGA has been updated. Current risk level: LOW. No cases reported in the past 14 days. Environmental indicators remain favorable. Continue routine surveillance.",
                "triggered_by": {
                    "risk_score": 0.18,
                    "previous_risk_score": 0.34,
                    "risk_level": "green",
                    "cases_14day": 0
                },
                "created_at": datetime.utcnow() - timedelta(days=5),
                "is_active": False,
                "resolved_at": datetime.utcnow() - timedelta(days=3)
            },
            # Additional warning alert for variety
            {
                "lga_id": lga_map.get("Yakuur"),
                "level": "yellow",
                "severity": "warning",
                "type": "cluster_detection",
                "title": "Case Cluster Detected",
                "message": "Spatial analysis has identified a cluster of 7 cases within a 2km radius in Ugep town, Yakuur LGA. Active case search and contact tracing initiated. Local water sources under investigation.",
                "triggered_by": {
                    "cluster_size": 7,
                    "cluster_radius_km": 2.1,
                    "location": "Ugep town center",
                    "analysis_method": "spatial_scan_statistic"
                },
                "created_at": datetime.utcnow() - timedelta(days=6),
                "is_active": True,
                "acknowledged_at": datetime.utcnow() - timedelta(days=5, hours=18),
                "acknowledged_by": 2
            }
        ]

        # Create alerts
        alerts_created = 0
        for alert_data in alerts_data:
            # Skip if LGA doesn't exist
            if alert_data["lga_id"] is not None and alert_data["lga_id"] not in [lga.id for lga in lgas]:
                continue

            # Check if similar alert already exists
            existing = db.query(Alert).filter(
                Alert.lga_id == alert_data["lga_id"],
                Alert.type == alert_data["type"],
                Alert.title == alert_data["title"]
            ).first()

            if not existing:
                alert = Alert(**alert_data)
                db.add(alert)
                alerts_created += 1
                print(f"  Created alert: {alert_data['title']}")

        db.commit()
        print(f"Created {alerts_created} demo alerts.")

        # Print summary
        active_alerts = sum(1 for a in alerts_data if a.get("is_active", True))
        critical_alerts = sum(1 for a in alerts_data if a.get("severity") == "critical")
        print(f"  Active alerts: {active_alerts}")
        print(f"  Critical alerts: {critical_alerts}")

    except Exception as e:
        print(f"Error seeding alerts: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def seed_mock_cholera_data():
    """Legacy function - now redirects to demo scenario."""
    print("Note: Using demo scenario instead of random mock data")
    seed_demo_scenario()


def seed_mock_environmental_data():
    """Legacy function - now redirects to demo scenario."""
    print("Note: Environmental data included in demo scenario")
    # Do nothing, handled by seed_demo_scenario


def calculate_initial_risks():
    """Calculate risk scores for all LGAs."""
    print("Calculating initial risk scores...")
    db = SessionLocal()

    try:
        calculator = RiskCalculator(db)
        results = calculator.calculate_all()

        success_count = sum(1 for r in results if "error" not in r)
        print(f"Calculated risk scores for {success_count} LGAs.")

        # Print summary
        high_risk = sum(1 for r in results if r.get("level") == "red")
        medium_risk = sum(1 for r in results if r.get("level") == "yellow")
        low_risk = sum(1 for r in results if r.get("level") == "green")

        print(f"  High risk (RED): {high_risk} LGAs")
        print(f"  Medium risk (YELLOW): {medium_risk} LGAs")
        print(f"  Low risk (GREEN): {low_risk} LGAs")

        # Print details of high-risk LGAs
        if high_risk > 0:
            print("\n  High-risk LGAs:")
            for r in results:
                if r.get("level") == "red":
                    print(f"    - {r['lga_name']}: score={r['score']:.3f}, cases={r['raw_values']['recent_cases']}")

    except Exception as e:
        print(f"Error calculating risks: {e}")
        raise
    finally:
        db.close()


def main():
    """Main seeding function."""
    print("=" * 50)
    print("Cross River State Cholera Surveillance Database Seeder")
    print("=" * 50)
    print()

    # Step 1: Create tables
    create_tables()
    print()

    # Step 2: Seed LGAs
    seed_lgas()
    print()

    # Step 3: Seed demo scenario (includes both environmental and case data)
    seed_demo_scenario()
    print()

    # Step 4: Calculate risk scores
    calculate_initial_risks()
    print()

    # Step 5: Seed demo alerts
    seed_demo_alerts()
    print()

    print("=" * 50)
    print("Database seeding completed successfully!")
    print("=" * 50)
    print("\nDemo Scenario Summary:")
    print("- Timeline: Past 60 days of data")
    print("- Heavy rainfall: 4 weeks ago")
    print("- Flooding detected: 3 weeks ago in Calabar South & Odukpani")
    print("- Outbreak started: 3 weeks ago")
    print("- Peak cases: 4 days ago")
    print("- Current status: Cases declining (intervention effect)")
    print("- Expected result: 2-3 high-risk (RED) LGAs, 4-5 medium-risk (YELLOW) LGAs")
    print("- Demo alerts: 8 alerts created (2 critical, 4 warning, 2 info)")


if __name__ == "__main__":
    main()
