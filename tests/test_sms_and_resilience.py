"""
Automated Unit & Integration Tests: SMS Service, Source Resilience, Citizen Reports, and Provenance
Validates Phase 4, Phase 6, Phase 11, Phase 13, and Phase 17 requirements.
"""

import pytest
import time
from backend.sms_service import Fast2SMSService
from backend.source_health import SourceHealthMonitor
from backend.citizen_reports import CitizenReportManager, CitizenReportSubmission

def test_indian_phone_number_normalization():
    svc = Fast2SMSService()
    # Valid Indian formats
    assert svc.normalize_indian_phone("9820123456") == "9820123456"
    assert svc.normalize_indian_phone("+91 98201 23456") == "9820123456"
    assert svc.normalize_indian_phone("919820123456") == "9820123456"
    assert svc.normalize_indian_phone("09820123456") == "9820123456"
    assert svc.normalize_indian_phone("7890123456") == "7890123456"
    assert svc.normalize_indian_phone("6789012345") == "6789012345"

    # Invalid formats
    assert svc.normalize_indian_phone("12345") is None
    assert svc.normalize_indian_phone("5123456789") is None  # Doesn't start with 6-9
    assert svc.normalize_indian_phone("abcdefghij") is None
    assert svc.normalize_indian_phone("+1 555 123 4567") is None

def test_sms_privacy_masking():
    svc = Fast2SMSService()
    assert svc.mask_phone("9820123456") == "+91-XXXXX-3456"

def test_sms_mock_mode_when_disabled():
    svc = Fast2SMSService()
    svc.enabled = False
    result = svc.send_commute_sms_alert("9820123456", "UrbanPulse: Rain warning on WEH corridor.")
    assert result["success"] is True
    assert result["status"] == "mock_accepted"
    assert result["masked_recipients"] == ["+91-XXXXX-3456"]

def test_sms_idempotency_guard():
    svc = Fast2SMSService()
    svc.enabled = False
    res1 = svc.send_commute_sms_alert("9820123456", "Identical alert test")
    res2 = svc.send_commute_sms_alert("9820123456", "Identical alert test")
    assert res1["status"] == "mock_accepted"
    assert res2["status"] == "duplicate_suppressed"

def test_source_health_tracking():
    sh = SourceHealthMonitor()
    assert sh.get_source_status("open_meteo_weather")["status"] == "ONLINE"
    
    # Simulate failures
    sh.record_source_failure("open_meteo_weather", "Timeout connecting to provider")
    assert sh.get_source_status("open_meteo_weather")["status"] == "DEGRADED"

    sh.record_source_failure("open_meteo_weather", "Timeout connecting to provider")
    sh.record_source_failure("open_meteo_weather", "Timeout connecting to provider")
    assert sh.get_source_status("open_meteo_weather")["status"] == "OFFLINE"

    # Recovery
    sh.record_source_success("open_meteo_weather")
    assert sh.get_source_status("open_meteo_weather")["status"] == "ONLINE"

def test_resilient_confidence_calculation():
    sh = SourceHealthMonitor()
    
    # Missing sensor must NOT allow confidence to inflate or claim sensor proof
    eval_res = sh.calculate_resilient_confidence(
        base_confidence=0.95,
        supporting_sources=["WEATHER", "CITIZEN"],
        has_sensor_data=False,
        has_weather_data=True,
        has_citizen_reports=True
    )
    # Capped at <= 0.78 when physical sensor is missing
    assert eval_res["confidence_score"] <= 0.78
    assert "Physical Water/Road Sensor" in eval_res["missing_sources"]
    assert eval_res["is_derived_or_inferred"] is True

def test_citizen_report_submission_and_bounds():
    crm = CitizenReportManager()
    
    # Valid report inside Mumbai bounds
    valid_sub = CitizenReportSubmission(
        category="WATERLOGGING",
        title="Waterlogging at SV Road",
        description="Water depth ~1 foot near Andheri station west",
        latitude=19.1196,
        longitude=72.8433,
        user_name="Pooja"
    )
    res = crm.submit_report(valid_sub)
    assert res["success"] is True
    assert res["incident"]["provenance"] == "CITIZEN_REPORT"
    assert res["incident"]["verification_status"] == "COMMUNITY_UNVERIFIED"

    # Invalid report outside Mumbai bounding box (e.g. lat 18.2 is within Pydantic range 18-20, but outside Mumbai min_lat 18.8)
    invalid_sub = CitizenReportSubmission(
        category="WATERLOGGING",
        title="Waterlogging outside boundary",
        description="Outside the Mumbai metropolitan limits",
        latitude=18.2000,
        longitude=72.2000
    )
    res_inv = crm.submit_report(invalid_sub)
    assert res_inv["success"] is False
    assert "outside the supported Mumbai" in res_inv["error"]

    # Coordinates outside Pydantic validation range
    with pytest.raises(Exception):
        CitizenReportSubmission(
            category="WATERLOGGING",
            title="Invalid coordinates",
            description="Coordinates totally outside valid bounds",
            latitude=45.0,
            longitude=120.0
        )
