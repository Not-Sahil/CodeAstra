"""
Comprehensive Automated Tests for Personalized Location-Based Alert Generation
Covers:
1. Nearby incident within radius generates eligible alerts.
2. Incidents outside configured radius are excluded.
3. Commute corridor isolation: off-route incidents do NOT trigger commute alerts.
4. Resolved and invalid-coordinate incidents handled appropriately.
5. Missing sensor data triggers qualified assessments (never fabricated readings).
6. Duplicate events and rapid re-evaluations do not produce duplicate alerts within cooldown.
7. Meaningful severity changes generate follow-up escalation alerts.
8. User isolation and privacy: User A cannot access User B's private notifications.
9. Disabled notifications and user opt-outs are respected.
10. Backend retries / idempotency tokens prevent duplicate alerts.
11. SMS and push delivery failures are handled honestly.
"""

import time
import pytest
from unittest.mock import MagicMock, patch

from backend.alert_engine import PersonalizedAlertEngine, COOLDOWN_WINDOW_SECONDS
from backend.supabase_service import (
    save_user_notification,
    get_user_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    get_unread_notifications_count,
    _local_notifications
)

# Test Commuter Persona A
USER_ALICE = {
    "id": "user-uuid-alice-001",
    "user_code": "COMMUTER_ALICE",
    "full_name": "Alice Sharma",
    "email": "alice@mumbai.edu.in",
    "phone": "+91 98201 22334",
    "default_origin": "Ashokvan (Borivali East)",
    "default_destination": "Versova (Andheri West)",
    "preferred_mode": "DRIVE",
    "nearby_radius_km": 1.0,
    "min_alert_severity": "MODERATE",
    "sms_consent": True,
    "sms_notifications_enabled": True,
    "alert_preferences": {
        "notify_nearby": True,
        "notify_commute": True,
        "notify_updates": True,
        "nearby_radius_km": 1.0,
        "sms_enabled": True,
        "web_push_enabled": True
    },
    "saved_locations": [
        {"name": "Home", "lat": 19.1875, "lon": 72.8504},  # Malad-Kandivali section
        {"name": "College", "lat": 19.1350, "lon": 72.8250}  # Versova
    ]
}

# Test Commuter Persona B (Opted out of SMS and nearby alerts)
USER_BOB = {
    "id": "user-uuid-bob-002",
    "user_code": "COMMUTER_BOB",
    "full_name": "Bob Patil",
    "email": "bob@corporate.co.in",
    "phone": "+91 98111 55667",
    "default_origin": "Dadar TT Circle",
    "default_destination": "BKC G-Block",
    "preferred_mode": "DRIVE",
    "nearby_radius_km": 0.5,
    "min_alert_severity": "MAJOR",
    "sms_consent": False,  # Opted out of SMS
    "sms_notifications_enabled": False,
    "alert_preferences": {
        "notify_nearby": False,  # Opted out of nearby
        "notify_commute": True,
        "notify_updates": True,
        "sms_enabled": False,
        "web_push_enabled": True
    },
    "saved_locations": []
}

@pytest.fixture
def clean_notifications():
    """Ensure local notification store and alert ledger are fresh for each test."""
    _local_notifications.clear()
    engine = PersonalizedAlertEngine()
    return engine

# =============================================================================
# TEST 1 & 2: NEARBY RADIUS FILTERING (Within vs Outside Configured Radius)
# =============================================================================
def test_nearby_incident_within_radius_generates_alert(clean_notifications):
    alert_engine = clean_notifications

    # Incident right at Alice's Home coordinates (19.1875, 72.8504) - within 1.0km
    close_incident = {
        "incident_id": "INC_NEAR_01",
        "title": "Waterlogging at Malad Subway",
        "scenario_type": "Urban Flooding",
        "severity_level": "MAJOR_LEVEL_3",
        "centroid_lat": 19.1880,
        "centroid_lon": 72.8508,
        "status": "ACTIVE",
        "affected_infrastructure": "Malad Subway Underpass",
        "confidence_score": 0.90,
        "source": "MUNICIPAL_CAD"
    }

    alerts = alert_engine.evaluate_alerts_for_user(USER_ALICE, active_incidents=[close_incident])
    
    nearby_alerts = [a for a in alerts if a["alert_type"] == "NEARBY"]
    assert len(nearby_alerts) >= 1
    assert "Malad Subway" in nearby_alerts[0]["title"]
    assert nearby_alerts[0]["severity"] == "MAJOR"

def test_incident_outside_radius_is_excluded(clean_notifications):
    alert_engine = clean_notifications

    # Incident in South Mumbai (Haji Ali: 18.9774, 72.8105) - over 20 km away from Alice
    far_incident = {
        "incident_id": "INC_FAR_01",
        "title": "Haji Ali Sea Spray Influx",
        "scenario_type": "Road Disruption",
        "severity_level": "MAJOR_LEVEL_3",
        "centroid_lat": 18.9774,
        "centroid_lon": 72.8105,
        "status": "ACTIVE",
        "affected_infrastructure": "Coastal Road Promenade",
        "confidence_score": 0.88
    }

    # Alice's current GPS is near Borivali (19.2288, 72.8541)
    current_gps = {"lat": 19.2288, "lon": 72.8541}
    alerts = alert_engine.evaluate_alerts_for_user(USER_ALICE, current_coords=current_gps, active_incidents=[far_incident])
    
    nearby_alerts = [a for a in alerts if a["alert_type"] == "NEARBY"]
    # Haji Ali is outside 1.0 km radius from both current GPS and saved places
    assert len(nearby_alerts) == 0

# =============================================================================
# TEST 3: COMMUTE CORRIDOR ISOLATION (Off-Route Hazards Excluded)
# =============================================================================
def test_off_route_incident_does_not_trigger_commute_alert(clean_notifications):
    alert_engine = clean_notifications

    # Kurla flooding (Central Mumbai: 19.0680, 72.8790) is far away from the Western Suburbs
    # commute corridor (Ashokvan Borivali to Versova Andheri)
    kurla_incident = {
        "incident_id": "INC_KURLA_OFF_ROUTE",
        "title": "Kurla Central Railway Track Inundation",
        "scenario_type": "Urban Flooding",
        "severity_level": "CRITICAL_LEVEL_4",
        "centroid_lat": 19.0680,
        "centroid_lon": 72.8790,
        "status": "ACTIVE",
        "affected_infrastructure": "LBS Marg Kurla West",
        "confidence_score": 0.95
    }

    # Mock engine google_routing to return a western corridor polyline
    mock_engine = MagicMock()
    mock_engine.google_routing.resolve_location.side_effect = lambda loc: ([19.2288, 72.8541], True, "OK") if "Ashokvan" in loc else ([19.1350, 72.8250], True, "OK")
    mock_engine.google_routing.compute_routes.return_value = {
        "success": True,
        "routes": [{
            "polyline_coords": [
                [19.2288, 72.8541],
                [19.1875, 72.8504],
                [19.1430, 72.8578],
                [19.1350, 72.8250]
            ]
        }]
    }
    alert_engine.set_engine_ref(mock_engine)

    alerts = alert_engine.evaluate_alerts_for_user(USER_ALICE, active_incidents=[kurla_incident])
    commute_alerts = [a for a in alerts if a["alert_type"] == "COMMUTE"]
    
    # Kurla is off-route and must NOT be classified as a commute disruption
    assert len(commute_alerts) == 0

# =============================================================================
# TEST 4: RESOLVED & INVALID COORDINATES HANDLING
# =============================================================================
def test_resolved_and_invalid_location_incidents_handled(clean_notifications):
    alert_engine = clean_notifications

    # 1. Incident with no coordinates
    no_coord_inc = {
        "incident_id": "INC_NO_COORD",
        "title": "Unlocated road issue",
        "status": "ACTIVE",
        "centroid_lat": None,
        "centroid_lon": None
    }

    # 2. Incident that is already RESOLVED without prior user notification
    resolved_inc = {
        "incident_id": "INC_ALREADY_RESOLVED",
        "title": "Cleared fallen tree",
        "status": "RESOLVED",
        "centroid_lat": 19.1875,
        "centroid_lon": 72.8504
    }

    alerts = alert_engine.evaluate_alerts_for_user(USER_ALICE, active_incidents=[no_coord_inc, resolved_inc])
    assert len(alerts) == 0

# =============================================================================
# TEST 5: MISSING SENSOR DATA HONESTY (Resilience without fabrication)
# =============================================================================
def test_missing_sensor_data_generates_qualified_assessment(clean_notifications):
    alert_engine = clean_notifications

    # Waterlogging incident where water-level sensor telemetry is unverified / missing
    unverified_sensor_inc = {
        "incident_id": "INC_SENSOR_OFFLINE_01",
        "title": "Suspected Waterlogging near SV Road",
        "scenario_type": "Urban Flooding",
        "severity_level": "MAJOR_LEVEL_3",
        "centroid_lat": 19.1875,
        "centroid_lon": 72.8504,
        "status": "ACTIVE",
        "sensor_verified": False,  # Missing direct sensor reading
        "verification_status": "COMMUNITY_UNVERIFIED",
        "affected_infrastructure": "SV Road Culvert",
        "confidence_score": 0.68
    }

    # Mark offline sensor in engine
    mock_engine = MagicMock()
    mock_engine.offline_sensors = {"SENSOR_WL_01"}
    mock_engine.google_routing.resolve_location.return_value = ([19.1875, 72.8504], False, "Not used")
    alert_engine.set_engine_ref(mock_engine)

    alerts = alert_engine.evaluate_alerts_for_user(USER_ALICE, active_incidents=[unverified_sensor_inc])
    assert len(alerts) >= 1
    alert = alerts[0]

    # Must contain explicit missing-sensor disclaimer
    assert alert["missing_data_qualification"] is not None
    assert "Direct water-level sensor telemetry is currently offline/unavailable" in alert["missing_data_qualification"]
    assert "sensor-confirmed" in alert["missing_data_qualification"]

# =============================================================================
# TEST 6: DEDUPLICATION & COOLDOWN (Anti-Spam)
# =============================================================================
def test_duplicate_events_do_not_produce_repeated_notifications(clean_notifications):
    alert_engine = clean_notifications

    incident = {
        "incident_id": "INC_DEDUP_TEST",
        "title": "Track Submergence at Malad",
        "scenario_type": "Urban Flooding",
        "severity_level": "MODERATE_LEVEL_2",
        "centroid_lat": 19.1875,
        "centroid_lon": 72.8504,
        "status": "ACTIVE",
        "affected_infrastructure": "Western Line Track Section",
        "confidence_score": 0.88
    }

    # First dispatch: Eligible
    alerts_1 = alert_engine.evaluate_alerts_for_user(USER_ALICE, active_incidents=[incident])
    assert len(alerts_1) >= 1

    # Immediate second dispatch with identical incident: Must be suppressed by cooldown
    alerts_2 = alert_engine.evaluate_alerts_for_user(USER_ALICE, active_incidents=[incident])
    assert len(alerts_2) == 0

# =============================================================================
# TEST 7: MEANINGFUL SEVERITY ESCALATION (Bypasses Cooldown for Follow-up Alert)
# =============================================================================
def test_severity_escalation_generates_follow_up_alert(clean_notifications):
    alert_engine = clean_notifications

    # Step A: Moderate incident
    incident_v1 = {
        "incident_id": "INC_ESCALATE_01",
        "title": "Water accumulation at Subway",
        "scenario_type": "Urban Flooding",
        "severity_level": "MODERATE_LEVEL_2",
        "centroid_lat": 19.1875,
        "centroid_lon": 72.8504,
        "status": "ACTIVE",
        "affected_infrastructure": "Subway Ramps"
    }
    alerts_v1 = alert_engine.evaluate_alerts_for_user(USER_ALICE, active_incidents=[incident_v1])
    assert len(alerts_v1) >= 1
    assert alerts_v1[0]["severity"] == "MODERATE"

    # Step B: Severity escalates to CRITICAL (e.g. cloudburst, full closure)
    incident_v2 = {
        "incident_id": "INC_ESCALATE_01",
        "title": "Subway Submerged & Road Closed",
        "scenario_type": "Urban Flooding",
        "severity_level": "CRITICAL_LEVEL_4",
        "centroid_lat": 19.1875,
        "centroid_lon": 72.8504,
        "status": "ACTIVE",
        "affected_infrastructure": "Subway Ramps & Junction"
    }
    alerts_v2 = alert_engine.evaluate_alerts_for_user(USER_ALICE, active_incidents=[incident_v2])
    
    # Escalation must generate follow-up alert of type UPDATE
    assert len(alerts_v2) >= 1
    escalation_alert = alerts_v2[0]
    assert escalation_alert["alert_type"] == "UPDATE"
    assert escalation_alert["severity"] == "CRITICAL"
    assert "Escalation Alert" in escalation_alert["title"]

# =============================================================================
# TEST 8: USER ISOLATION & ROW LEVEL SECURITY
# =============================================================================
def test_user_cannot_access_another_users_notifications(clean_notifications):
    # Save a notification for Alice
    save_user_notification({
        "user_code": "COMMUTER_ALICE",
        "user_id": "user-uuid-alice-001",
        "alert_type": "NEARBY",
        "title": "Alice's Private Route Alert",
        "message": "Only Alice should see this.",
        "severity": "MAJOR"
    })

    # Save a notification for Bob
    save_user_notification({
        "user_code": "COMMUTER_BOB",
        "user_id": "user-uuid-bob-002",
        "alert_type": "COMMUTE",
        "title": "Bob's Private Commute Alert",
        "message": "Only Bob should see this.",
        "severity": "CRITICAL"
    })

    # Query Alice's alerts
    alice_notifs = get_user_notifications("COMMUTER_ALICE")
    alice_titles = [n["title"] for n in alice_notifs]
    assert "Alice's Private Route Alert" in alice_titles
    assert "Bob's Private Commute Alert" not in alice_titles

    # Query Bob's alerts
    bob_notifs = get_user_notifications("COMMUTER_BOB")
    bob_titles = [n["title"] for n in bob_notifs]
    assert "Bob's Private Commute Alert" in bob_titles
    assert "Alice's Private Route Alert" not in bob_titles

# =============================================================================
# TEST 9: USER OPT-OUTS AND DISABLED CHANNELS
# =============================================================================
def test_user_opt_outs_are_respected(clean_notifications):
    alert_engine = clean_notifications

    # Incident near Dadar (19.0195, 72.8430)
    incident = {
        "incident_id": "INC_DADAR_01",
        "title": "Dadar TT Circle Flooding",
        "severity_level": "MAJOR_LEVEL_3",
        "centroid_lat": 19.0195,
        "centroid_lon": 72.8430,
        "status": "ACTIVE",
        "affected_infrastructure": "Dadar TT Circle"
    }

    # Bob has `notify_nearby: False` and `sms_consent: False`
    alerts = alert_engine.evaluate_alerts_for_user(USER_BOB, active_incidents=[incident])
    
    # No nearby alerts should be generated
    nearby = [a for a in alerts if a["alert_type"] == "NEARBY"]
    assert len(nearby) == 0

    for a in alerts:
        # SMS channel must NOT be included because Bob opted out
        assert "SMS" not in a.get("channels", [])

# =============================================================================
# TEST 10: IDEMPOTENCY TOKEN PREVENTS RETRY DUPLICATES
# =============================================================================
def test_idempotency_token_prevents_duplicate_saves(clean_notifications):
    notif_data = {
        "user_code": "COMMUTER_ALICE",
        "alert_type": "COMMUTE",
        "title": "Retry Test Alert",
        "message": "Testing backend retries.",
        "severity": "MODERATE",
        "idempotency_key": "idemp_token_unique_12345"
    }

    # First attempt: Saved
    res1 = save_user_notification(notif_data)
    assert res1.get("status") in ["SAVED_LOCALLY", "SAVED_TO_SUPABASE", "CACHED_LOCALLY"]

    # Second retry attempt with identical idempotency token: Suppressed
    res2 = save_user_notification(notif_data)
    assert res2.get("status") == "DUPLICATE_IDEMPOTENCY_SUPPRESSED"

    # Only 1 notification should exist
    user_notifs = get_user_notifications("COMMUTER_ALICE")
    assert len(user_notifs) == 1

# =============================================================================
# TEST 11: SMS DELIVERY STATUS HONESTY (Failure reporting)
# =============================================================================
def test_sms_failure_recorded_honestly(clean_notifications):
    alert_engine = clean_notifications

    critical_incident = {
        "incident_id": "INC_CRIT_SMS",
        "title": "Major Highway Collapse",
        "severity_level": "CRITICAL_LEVEL_4",
        "centroid_lat": 19.1875,
        "centroid_lon": 72.8504,
        "status": "ACTIVE",
        "affected_infrastructure": "Western Express Highway"
    }

    # Mock sms_service to simulate provider rejection
    with patch("backend.alert_engine.sms_service.send_commute_sms_alert") as mock_sms:
        mock_sms.return_value = {
            "success": False,
            "status": "rejected_by_gateway",
            "error": "Provider gateway timeout"
        }

        alerts = alert_engine.evaluate_alerts_for_user(USER_ALICE, active_incidents=[critical_incident])
        assert len(alerts) >= 1
        
        # Delivery status must reflect the failure, not claim DELIVERED
        assert alerts[0]["delivery_status"] in ["PARTIAL_SMS_FAILED", "FAILED"]
