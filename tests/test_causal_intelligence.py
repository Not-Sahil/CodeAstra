import pytest
from datetime import datetime
from backend.engine import IncidentIntelligenceEngine
from backend.supabase_service import (
    save_municipal_work_order,
    update_municipal_work_order,
    get_municipal_work_orders,
    get_municipal_work_order_by_id,
    get_work_order_audit_logs
)

@pytest.fixture
def engine():
    eng = IncidentIntelligenceEngine()
    eng.execute_replay_action("RESET")
    return eng

# =============================================================================
# 1. ROOT-CAUSE VS. SYMPTOMS TESTS
# =============================================================================

def test_root_cause_vs_symptoms_distinct_categories(engine):
    """Test that initiating cause, directly observed symptoms, and consequences are strictly segregated."""
    analysis = engine.get_root_cause_analysis("INC_MUM_20260715_01")
    
    assert "root_cause" in analysis
    assert "observed_symptoms" in analysis
    assert "potential_consequences" in analysis
    assert "correlated_observations" in analysis
    
    # Observed facts must be classified as DIRECTLY_OBSERVED_FACT
    symptoms = analysis["observed_symptoms"]
    assert len(symptoms) >= 3
    for s in symptoms:
        assert s["evidence_tier"] == "DIRECTLY_OBSERVED_FACT"
        assert "measured_value" in s

    # Potential consequences must be classified as POTENTIAL_CONSEQUENCE
    consequences = analysis["potential_consequences"]
    assert len(consequences) >= 2
    for c in consequences:
        assert c["evidence_tier"] == "POTENTIAL_CONSEQUENCE"

def test_unsupported_root_cause_displays_undetermined(engine):
    """Test that when confidence is low or unverified, root cause displays 'Root cause undetermined'."""
    # Force low confidence via contradictory signal and dropouts
    engine.has_contradictory = True
    engine.offline_sensors.add("BMC_FLD_MALAD_SUB")
    
    analysis = engine.get_root_cause_analysis("INC_MUM_20260715_01")
    assert analysis["has_supported_root_cause"] is False
    assert analysis["root_cause"]["title"] == "Root cause undetermined"
    assert "75%" in analysis["root_cause"]["description"]

def test_contradictory_evidence_preserved_not_suppressed(engine):
    """Test that contradictory sensor observation is preserved in ledger instead of discarded."""
    engine.execute_replay_action("ADD_CONTRADICTORY")
    analysis = engine.get_root_cause_analysis("INC_MUM_20260715_01")
    
    contradictions = analysis["contradictory_evidence"]
    assert len(contradictions) >= 1
    assert contradictions[0]["source"] == "BMC_FLD_MALAD_NORTH"
    assert "Preserved conflict" in contradictions[0]["reconciliation_decision"]

def test_railway_disruption_kept_distinct_not_blindly_merged(engine):
    """Test that correlated railway disruption is kept distinct from road flood."""
    analysis = engine.get_root_cause_analysis("INC_MUM_20260715_01")
    corr = analysis["correlated_observations"]
    rail_obs = next((c for c in corr if "Western Railway" in c["title"]), None)
    assert rail_obs is not None
    assert "kept separate from municipal road flooding" in rail_obs["relationship"]

# =============================================================================
# 2. INTERACTIVE TIMELINE SCRUBBER TESTS
# =============================================================================

def test_timeline_scrubber_event_sequence(engine):
    """Test that scrubber sequence contains all required event arrival types."""
    events = engine.get_timeline_scrubber_events("INC_MUM_20260715_01")
    assert len(events) == 9
    
    # Delayed event (Step 5)
    delayed = events[5]
    assert delayed["is_delayed"] is True
    assert delayed["event_timestamp"] == "08:04:12 IST"
    assert delayed["ingestion_timestamp"] == "08:11:15 IST"
    
    # Duplicate event (Step 6)
    duplicate = events[6]
    assert duplicate["is_duplicate"] is True
    
    # Contradictory event (Step 7)
    contradictory = events[7]
    assert contradictory["is_contradictory"] is True
    
    # Sensor dropout event (Step 8)
    dropout = events[8]
    assert dropout["is_dropout"] is True

def test_historical_state_reconstruction_does_not_mutate_baseline(engine):
    """Test moving scrubber backwards/forwards reconstructs state deterministically without altering database."""
    # Step 0: Ambient monitoring
    state_0 = engine.reconstruct_incident_state_at_step("INC_MUM_20260715_01", step_index=0)
    assert state_0["confidence_score"] == 0.42
    assert state_0["incident_status"] == "MONITORING"
    assert state_0["root_cause_status"] == "Root cause undetermined"
    assert state_0["nodes_count"] == 1
    
    # Step 4: Speed collapse & multimodal corroboration
    state_4 = engine.reconstruct_incident_state_at_step("INC_MUM_20260715_01", step_index=4)
    assert state_4["confidence_score"] == 0.94
    assert state_4["incident_status"] == "MULTIMODAL_CONFIRMED"
    
    # Step 6: Duplicate report does NOT inflate confidence
    state_6 = engine.reconstruct_incident_state_at_step("INC_MUM_20260715_01", step_index=6)
    state_5 = engine.reconstruct_incident_state_at_step("INC_MUM_20260715_01", step_index=5)
    assert state_6["confidence_score"] == state_5["confidence_score"]  # Confidence remains 0.95
    
    # Step 7: Contradictory reading downweights confidence
    state_7 = engine.reconstruct_incident_state_at_step("INC_MUM_20260715_01", step_index=7)
    assert state_7["confidence_score"] == 0.76  # Penalized
    assert state_7["confidence_rating"] == "Moderate"

# =============================================================================
# 3. BEFORE VS. AFTER COMPARISON TESTS
# =============================================================================

def test_before_vs_after_comparison_structure(engine):
    """Test that Before vs After toggle accurately compares legacy fragmented alerts against fusion."""
    comp = engine.get_before_vs_after_comparison("INC_MUM_20260715_01")
    
    assert comp["comparison_mode"] == "BEFORE_VS_AFTER"
    conv = comp["conventional_view"]
    fuse = comp["fusion_view"]
    delta = comp["delta_summary"]
    
    # Legacy view has 6 unlinked alerts
    assert conv["alerts_count"] == 6
    assert len(conv["alerts"]) == 6
    assert "SEVERE" in conv["alert_fatigue_index"]
    assert conv["causal_understanding"] == "0% (Symptom treated as cause, or cause ignored entirely)"
    
    # Fused view has 1 unified incident with root cause
    assert fuse["incident_count"] == 1
    assert "83.3%" in fuse["alerts_reduced_percentage"]
    assert fuse["fused_data"]["best_supported_root_cause"] is not None
    assert "350m" in fuse["spatial_precision"]
    assert fuse["fused_data"]["unaffected_commuters_spared"] == 85000
    
    # Delta summary proves key metrics
    assert "83% reduction" in delta["noise_reduction"]

# =============================================================================
# 4. EXPLAINABLE OPERATOR BRIEFING TESTS
# =============================================================================

def test_explainable_operator_briefing_10_points(engine):
    """Test that operator briefing systematically answers all 10 prompt questions with recorded facts."""
    briefing = engine.generate_explainable_operator_briefing("INC_MUM_20260715_01")
    
    assert briefing["q1_what_is_happening"] is not None
    assert briefing["q2_supported_explanation"] is not None
    assert len(briefing["q3_supporting_observations"]) >= 2
    assert "Confidence score adjusted" in briefing["q5_confidence_delta"]
    assert len(briefing["q7_excluded_sensors"]) >= 2
    assert "85,000" in briefing["q8_public_impact"]
    assert "dewatering pump" in briefing["q9_recommended_action"].lower()
    assert len(briefing["q10_uncertainties"]) >= 1

def test_sensor_exclusion_traceable_reasons_never_invented(engine):
    """Test that excluded sensors have factual, recorded reasons in sensor exclusion ledger."""
    briefing = engine.generate_explainable_operator_briefing("INC_MUM_20260715_01")
    ledger = briefing["sensor_exclusion_ledger"]
    
    # Contradicting gauge
    north_gauge = next(s for s in ledger if s["sensor_id"] == "BMC_FLD_MALAD_NORTH")
    assert "directly contradicted 3 independent physical gauges" in north_gauge["reason"]
    
    # Out of bounds sensor
    goregaon_aws = next(s for s in ledger if s["sensor_id"] == "BMC_AWS_GOREGAON_PERIPHERY")
    assert "exceeded the maximum incident spatial correlation radius" in goregaon_aws["reason"]
    
    # Duplicate tweet
    dup_tweet = next(s for s in ledger if s["sensor_id"] == "CITIZEN_TWEET_7782")
    assert "cosine text similarity" in dup_tweet["reason"]

def test_operator_query_targeted_explanation(engine):
    """Test query: 'Explain why confidence dropped and why Sensor #3 was ignored'."""
    query = "Explain why confidence dropped and why Sensor BMC_FLD_MALAD_NORTH was ignored"
    briefing = engine.generate_explainable_operator_briefing("INC_MUM_20260715_01", query=query)
    
    assert briefing["operator_query"] == query
    resp = briefing["query_response"]
    assert "Confidence Analysis" in resp
    assert "Sensor Exclusion Analysis" in resp
    assert "BMC_FLD_MALAD_NORTH" in resp

# =============================================================================
# 5. MUNICIPAL WORK ORDER GENERATION & WORKFLOW TESTS
# =============================================================================

def test_generate_draft_work_order(engine):
    """Test that municipal work order draft is generated with all operational fields."""
    order = engine.generate_draft_work_order("INC_MUM_20260715_01", operator="OFFICER_PATIL")
    
    assert order["work_order_id"].startswith("WO-MUM-2026-")
    assert order["status"] == "DRAFT"
    assert order["created_by"] == "OFFICER_PATIL"
    assert order["external_transmission_status"] == "NOT_TRANSMITTED"
    
    # Suggested resources must require on-site verification
    resources = order["suggested_resources"]
    assert len(resources) >= 3
    for r in resources:
        assert r["status"] == "REQUIRES_ON_SITE_VERIFICATION"
        
    # Safety considerations and verification steps must be present
    assert len(order["verification_steps"]) >= 4
    assert len(order["safety_considerations"]) >= 3

def test_unauthorized_user_cannot_approve_work_order():
    """Test that role 'CITIZEN' is blocked from approving work orders, raising PermissionError."""
    order = save_municipal_work_order({
        "work_order_id": "WO-MUM-2026-TEST01",
        "incident_id": "INC_MUM_20260715_01",
        "incident_type": "Urban Flooding",
        "location_name": "Malad Subway",
        "latitude": 19.1875,
        "longitude": 72.8504,
        "problem_description": "Waterlogging test",
        "status": "DRAFT"
    })
    
    with pytest.raises(PermissionError) as exc_info:
        update_municipal_work_order(
            work_order_id="WO-MUM-2026-TEST01",
            updates={"status": "APPROVED"},
            actor="Citizen_User",
            role="CITIZEN"
        )
    assert "not authorized" in str(exc_info.value)
    
    # Audit log must record unauthorized blocked attempt
    audit = get_work_order_audit_logs("WO-MUM-2026-TEST01")
    assert any(a["action"] == "UNAUTHORIZED_ACTION_BLOCKED" for a in audit)

def test_authorized_operator_approval_workflow():
    """Test authorized operator approves draft work order and audit trail is logged."""
    order_id = "WO-MUM-2026-TEST02"
    save_municipal_work_order({
        "work_order_id": order_id,
        "incident_id": "INC_MUM_20260715_01",
        "incident_type": "Urban Flooding",
        "location_name": "Malad Subway",
        "latitude": 19.1875,
        "longitude": 72.8504,
        "problem_description": "Waterlogging test",
        "status": "DRAFT"
    })
    
    # Authorized operator approves
    updated = update_municipal_work_order(
        work_order_id=order_id,
        updates={"status": "APPROVED", "operator_notes": "Reviewed and cleared for crew mobilization."},
        actor="MUNICIPAL_DISPATCHER_1",
        role="OPERATOR"
    )
    
    assert updated["status"] == "APPROVED"
    assert updated["approved_by"] == "MUNICIPAL_DISPATCHER_1"
    assert updated["approved_at"] is not None
    
    # Verify audit trail
    audit = get_work_order_audit_logs(order_id)
    assert len(audit) >= 2  # DRAFT_CREATED and APPROVED
    assert audit[0]["action"] == "APPROVED"
    assert audit[0]["actor"] == "MUNICIPAL_DISPATCHER_1"
