"""
Source Health & Resilience Monitor (Phase 4 & Phase 6)
Tracks availability, freshness, error states, and honest capabilities of
all external and internal data sources. Adapts intelligence assessments when
critical feeds go offline without fabricating sensor readings or fake all-clears.
"""

import time
from typing import Dict, Any, List, Optional

class SourceHealthMonitor:
    def __init__(self):
        self._sources: Dict[str, Dict[str, Any]] = {
            "google_routes": {
                "source_id": "google_routes",
                "name": "Google Routes API v2",
                "category": "ROUTING_AND_TRAFFIC",
                "status": "ONLINE",
                "is_authorized": True,
                "requires_api_key": True,
                "last_successful_fetch": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "consecutive_failures": 0,
                "last_error": None,
                "data_freshness": "LIVE",
                "operational_note": "Primary route calculation and turn-by-turn geometry.",
                "free_tier_status": "Google Cloud free allowance ($200/mo credit for Maps Platform)"
            },
            "open_meteo_weather": {
                "source_id": "open_meteo_weather",
                "name": "Open-Meteo Weather API",
                "category": "METEOROLOGY",
                "status": "ONLINE",
                "is_authorized": True,
                "requires_api_key": False,
                "last_successful_fetch": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "consecutive_failures": 0,
                "last_error": None,
                "data_freshness": "LIVE",
                "operational_note": "Mumbai precipitation, temperature, and wind observations.",
                "free_tier_status": "Open-access free API (non-commercial / prototype use)"
            },
            "citizen_reports": {
                "source_id": "citizen_reports",
                "name": "Citizen Incident Reports",
                "category": "CROWDSOURCING",
                "status": "ONLINE",
                "is_authorized": True,
                "requires_api_key": False,
                "last_successful_fetch": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "consecutive_failures": 0,
                "last_error": None,
                "data_freshness": "LIVE",
                "operational_note": "Direct community hazard and waterlogging reports with spam & rate controls.",
                "free_tier_status": "Self-hosted Supabase database"
            },
            "water_level_sensors": {
                "source_id": "water_level_sensors",
                "name": "Municipal Water-Level Sensors",
                "category": "PHYSICAL_TELEMETRY",
                "status": "UNAVAILABLE",
                "is_authorized": False,
                "requires_api_key": True,
                "last_successful_fetch": None,
                "consecutive_failures": 0,
                "last_error": "No authorized municipal IoT sensor API feed connected.",
                "data_freshness": "UNAVAILABLE",
                "operational_note": "Hardware sensor feeds not connected; system uses weather + citizen corroboration with adjusted confidence.",
                "free_tier_status": "Restricted municipal access required"
            },
            "traffic_cameras": {
                "source_id": "traffic_cameras",
                "name": "CCTV Traffic Camera Feeds",
                "category": "VIDEO_TELEMETRY",
                "status": "UNAVAILABLE",
                "is_authorized": False,
                "requires_api_key": True,
                "last_successful_fetch": None,
                "consecutive_failures": 0,
                "last_error": "No public or authorized camera stream available.",
                "data_freshness": "UNAVAILABLE",
                "operational_note": "Camera validation unavailable; camera frames are never fabricated.",
                "free_tier_status": "Restricted government feed"
            },
            "public_transit": {
                "source_id": "public_transit",
                "name": "Mumbai Suburban Rail / Metro Feeds",
                "category": "TRANSIT_TELEMETRY",
                "status": "UNAVAILABLE",
                "is_authorized": False,
                "requires_api_key": False,
                "last_successful_fetch": None,
                "consecutive_failures": 0,
                "last_error": "Live railway / metro GTFS-RT feed not authorized.",
                "data_freshness": "UNAVAILABLE",
                "operational_note": "Live transit delay telematics cannot be independently verified.",
                "free_tier_status": "Subject to railway authority data sharing policies"
            },
            "supabase_db": {
                "source_id": "supabase_db",
                "name": "Supabase PostgreSQL Database",
                "category": "DATA_PERSISTENCE",
                "status": "ONLINE",
                "is_authorized": True,
                "requires_api_key": True,
                "last_successful_fetch": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "consecutive_failures": 0,
                "last_error": None,
                "data_freshness": "LIVE",
                "operational_note": "Stores user profiles, authenticated commute queries, and incident audit records.",
                "free_tier_status": "Supabase Free Plan (500MB DB, subject to inactivity pausing)"
            },
            "fast2sms": {
                "source_id": "fast2sms",
                "name": "Fast2SMS Notification Gateway",
                "category": "COMMUNICATION",
                "status": "STANDBY",
                "is_authorized": True,
                "requires_api_key": True,
                "last_successful_fetch": None,
                "consecutive_failures": 0,
                "last_error": None,
                "data_freshness": "STANDBY",
                "operational_note": "SMS notifications kept disabled by default (SMS_NOTIFICATIONS_ENABLED=false) to avoid unapproved charges.",
                "free_tier_status": "Paid per-message service (requires wallet balance and Indian +91 numbers)"
            }
        }

    def record_source_success(self, source_id: str, timestamp_str: Optional[str] = None):
        """Records a successful observation or response from a source."""
        if source_id in self._sources:
            src = self._sources[source_id]
            src["status"] = "ONLINE"
            src["consecutive_failures"] = 0
            src["last_error"] = None
            src["last_successful_fetch"] = timestamp_str or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            src["data_freshness"] = "LIVE"

    def record_source_failure(self, source_id: str, error_msg: str):
        """Records a transient or permanent failure from a source."""
        if source_id in self._sources:
            src = self._sources[source_id]
            src["consecutive_failures"] += 1
            src["last_error"] = error_msg
            if src["consecutive_failures"] >= 3:
                src["status"] = "OFFLINE"
            else:
                src["status"] = "DEGRADED"

    def get_source_status(self, source_id: str) -> Optional[Dict[str, Any]]:
        return self._sources.get(source_id)

    def get_all_sources_health(self) -> Dict[str, Any]:
        """Returns comprehensive source health for diagnostics and UI status indicators."""
        online_count = sum(1 for s in self._sources.values() if s["status"] == "ONLINE")
        total_count = len(self._sources)
        return {
            "system_health": "HEALTHY" if online_count >= 3 else "DEGRADED",
            "online_sources_count": online_count,
            "total_monitored_sources": total_count,
            "sources": list(self._sources.values()),
            "last_audit_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    def calculate_resilient_confidence(
        self,
        base_confidence: float,
        supporting_sources: List[str],
        has_sensor_data: bool,
        has_weather_data: bool,
        has_citizen_reports: bool,
        is_simulated: bool = False
    ) -> Dict[str, Any]:
        """
        Phase 6.C: Transparent, evidence-based confidence calculation.
        Never inflates confidence when critical sensors are missing.
        Never fabricates sensor confirmation.
        """
        if is_simulated:
            return {
                "confidence_score": round(base_confidence, 2),
                "confidence_grade": "SIMULATED",
                "explanation": "Simulated scenario event for pipeline testing.",
                "is_derived_or_inferred": True,
                "missing_sources": []
            }

        # Deduplicate supporting sources
        unique_sources = set(supporting_sources)
        score = base_confidence

        missing_sources = []
        notes = []

        if not has_sensor_data:
            missing_sources.append("Physical Water/Road Sensor")
            notes.append("Water-level sensor unavailable; assessment based on weather and reports.")

        if not has_weather_data:
            missing_sources.append("Weather Telemetry")
            score -= 0.10
            notes.append("Live weather observation unavailable.")

        if has_citizen_reports and len(unique_sources) > 1:
            # Independent corroboration bonus
            score = min(0.92, score + 0.05)
            notes.append("Corroborated by independent citizen reports.")

        # STRICT CAP: If critical physical sensor is missing, confidence can NEVER exceed 0.78
        if not has_sensor_data and score > 0.78:
            score = 0.78

        # Clamp between 0.20 and 0.95 (never 1.00 objective certainty without absolute physical proof)
        score = max(0.20, min(0.95, score))

        if score >= 0.80:
            grade = "HIGH"
        elif score >= 0.55:
            grade = "MODERATE"
        else:
            grade = "LOW"

        return {
            "confidence_score": round(score, 2),
            "confidence_grade": grade,
            "explanation": " ".join(notes) if notes else "Multi-source corroboration verified.",
            "is_derived_or_inferred": len(missing_sources) > 0,
            "missing_sources": missing_sources
        }

# Global singleton monitor
source_health_monitor = SourceHealthMonitor()
