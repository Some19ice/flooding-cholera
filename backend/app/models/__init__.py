"""Database models package."""
from app.models.lga import LGA, Ward
from app.models.case_report import CaseReport
from app.models.environmental import EnvironmentalData, RiskScore
from app.models.alert import Alert
from app.models.facility import HealthFacility

__all__ = ["LGA", "Ward", "CaseReport", "EnvironmentalData", "RiskScore", "Alert", "HealthFacility"]
