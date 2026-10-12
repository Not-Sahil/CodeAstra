"""
Citizen Incident Reports Handler (Phase 4.D)
Accepts and validates authenticated citizen reports with geographic boundaries,
rate limiting, duplicate detection, and clear community provenance tagging.
"""

import time
import uuid
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

# Coordinate bounding box for Mumbai Metropolitan Region
MUMBAI_BOUNDS = {
    "min_lat": 18.8000,
    "max_lat": 19.4000,
    "min_lon": 72.7000,
    "max_lon": 73.1500
}

class CitizenReportSubmission(BaseModel):
    category: str = Field(..., description="WATERLOGGING, ROAD_CLOSURE, ACCIDENT, TREE_FALL, TRAFFIC_JAM")
    title: str = Field(..., min_length=5, max_length=120)
    description: str = Field(..., min_length=10, max_length=500)
    latitude: float = Field(..., ge=18.0, le=20.0)
    longitude: float = Field(..., ge=72.0, le=74.0)
    user_name: Optional[str] = "Anonymous Commuter"
    user_id: Optional[str] = None
    severity: Optional[str] = "MODERATE"

class CitizenReportManager:
    def __init__(self):
        self._recent_submissions: List[Dict[str, Any]] = []
        self._user_last_submission_time: Dict[str, float] = {}

    def submit_report(self, report: CitizenReportSubmission) -> Dict[str, Any]:
        """
        Validates, rate-limits, and normalizes a citizen report.
        """
        now = time.time()
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now))
        
        # 1. Geographic validation
        if not (MUMBAI_BOUNDS["min_lat"] <= report.latitude <= MUMBAI_BOUNDS["max_lat"] and
                MUMBAI_BOUNDS["min_lon"] <= report.longitude <= MUMBAI_BOUNDS["max_lon"]):
            return {
                "success": False,
                "error": f"Coordinates ({report.latitude}, {report.longitude}) are outside the supported Mumbai metropolitan boundary."
            }

        # 2. Rate limiting per user / IP (max 1 report per 60 seconds)
        sender_key = report.user_id or report.user_name or "anon"
        last_time = self._user_last_submission_time.get(sender_key, 0)
        if now - last_time < 60:
            remaining = int(60 - (now - last_time))
            return {
                "success": False,
                "error": f"Rate limit reached. Please wait {remaining} seconds before submitting another incident report."
            }

        # 3. Duplicate detection within 200m and 10 minutes
        for existing in self._recent_submissions[-50:]:
            time_diff = now - existing.get("epoch_timestamp", 0)
            if time_diff < 600:  # 10 minutes
                lat_diff = abs(existing["latitude"] - report.latitude)
                lon_diff = abs(existing["longitude"] - report.longitude)
                # ~0.002 degrees is approx 220 meters
                if lat_diff < 0.002 and lon_diff < 0.002 and existing["category"] == report.category:
                    return {
                        "success": False,
                        "error": "A matching incident report has already been submitted for this location within the last 10 minutes. Thank you for your alert!",
                        "existing_incident_id": existing.get("incident_id")
                    }

        # 4. Create normalized incident record with honest community provenance
        incident_id = f"CITIZEN_{uuid.uuid4().hex[:8].upper()}"
        normalized_record = {
            "incident_id": incident_id,
            "title": report.title.strip(),
            "description": report.description.strip(),
            "category": report.category.upper(),
            "severity": report.severity.upper() if report.severity else "MODERATE",
            "latitude": round(report.latitude, 6),
            "longitude": round(report.longitude, 6),
            "status": "ACTIVE",
            "verification_status": "COMMUNITY_UNVERIFIED",
            "confidence": 0.65,  # Unverified community reports start with modest confidence
            "provenance": "CITIZEN_REPORT",
            "is_simulated": False,
            "source": f"Citizen ({report.user_name or 'Anonymous'})",
            "user_id": report.user_id,
            "timestamp": now_iso,
            "epoch_timestamp": now,
            "evidence_count": 1,
            "evidence_details": [
                {
                    "source": "CITIZEN_SUBMISSION",
                    "submitted_by": report.user_name,
                    "submitted_at": now_iso,
                    "text": report.description
                }
            ]
        }

        self._user_last_submission_time[sender_key] = now
        self._recent_submissions.append(normalized_record)

        return {
            "success": True,
            "incident_id": incident_id,
            "message": "Citizen incident report submitted successfully and added to city intelligence feed.",
            "incident": normalized_record
        }

citizen_report_manager = CitizenReportManager()
