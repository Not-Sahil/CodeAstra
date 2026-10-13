import os
import json
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from backend.engine import IncidentIntelligenceEngine
from backend.supabase_service import (
    get_supabase_status,
    save_commute_query_record,
    record_replay_action_log,
    sync_active_incidents,
    save_user_notification,
    get_user_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    get_unread_notifications_count,
    save_municipal_work_order,
    update_municipal_work_order,
    get_municipal_work_orders,
    get_municipal_work_order_by_id,
    get_work_order_audit_logs,
    save_operator_briefing,
    get_operator_briefings
)
from backend.alert_engine import alert_engine
from backend.auth_service import (
    register_user,
    login_user,
    get_all_users,
    get_user_by_code,
    update_user_profile
)
from backend.weather_service import WeatherService
from backend.source_health import source_health_monitor
from backend.citizen_reports import citizen_report_manager, CitizenReportSubmission
from backend.sms_service import sms_service, sendCommuteSmsAlert
from backend.email_service import email_service
from backend.scheduler import commute_scheduler

app = FastAPI(
    title="UrbanPulse AI: Multimodal Urban Incident Intelligence Engine",
    description="24-hour multimodal incident correlation, evidence graph, confidence ledger, and personalized commute alert API.",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = IncidentIntelligenceEngine()
weather_service = WeatherService()

@app.on_event("startup")
async def app_startup():
    """Start background daily commute alert scheduler."""
    await commute_scheduler.start(engine)

@app.on_event("shutdown")
def app_shutdown():
    commute_scheduler.stop()

class LoginRequest(BaseModel):
    identifier: str
    password: str

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = "+91 98000 00000"
    password: str
    role: Optional[str] = "CITIZEN"
    organization: Optional[str] = "Mumbai Commuter"
    employee_or_student_id: Optional[str] = ""
    default_origin: Optional[str] = "Ashokvan (Borivali East)"
    default_destination: Optional[str] = "Rajiv Gandhi Institute of Technology (RGIT, Versova)"
    corridor_landmark: Optional[str] = ""
    preferred_mode: Optional[str] = "DRIVE"
    secondary_mode: Optional[str] = "METRO"
    departure_time: Optional[str] = "08:00:00"
    target_arrival_time: Optional[str] = "09:00:00"
    scheduled_sms_time: Optional[str] = "08:00"
    sms_consent: Optional[bool] = False
    sms_notifications_enabled: Optional[bool] = False
    alert_preferences: Optional[Dict[str, Any]] = None
    emergency_contact: Optional[Dict[str, Any]] = None

class ReplayActionRequest(BaseModel):
    action_type: str
    payload: Optional[Dict[str, Any]] = None

@app.get("/api/auth/users")
def auth_list_users():
    """List registered commuters and demo personas."""
    return {"users": get_all_users()}

@app.post("/api/auth/login")
async def auth_login(req: LoginRequest):
    """Authenticate commuter with email/user_code/phone and password, and immediately scan corridor for login-time alerts."""
    try:
        user = login_user(req.identifier, req.password)
        login_alert = None
        try:
            login_alert = await commute_scheduler.evaluate_and_send_user_alert(user, is_login_or_manual=True)
        except Exception as e_alert:
            logger.warning(f"Error evaluating login alert for {user.get('email')}: {e_alert}")
        return {"status": "SUCCESS", "user": user, "login_alert": login_alert}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/register")
def auth_register(req: RegisterRequest):
    """Register new commuter with comprehensive transit profile & sync to Supabase."""
    try:
        user = register_user(req.dict())
        return {"status": "SUCCESS", "user": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/auth/user/{user_code}")
def auth_get_user(user_code: str):
    """Fetch user profile by user_code."""
    user = get_user_by_code(user_code)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": user}

@app.put("/api/auth/profile/{user_code}")
def auth_update_user_profile(user_code: str, updates: Dict[str, Any]):
    """Update profile and sync to Supabase."""
    try:
        user = update_user_profile(user_code, updates)
        return {"status": "SUCCESS", "user": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/health")
def health_check():
    return {"status": "ONLINE", "system": "CodeAstra Intelligence Engine", "version": "2.0.0"}

@app.get("/api/supabase/status")
def supabase_status():
    """Returns live connection status of Supabase PostgreSQL database."""
    return get_supabase_status()

@app.post("/api/supabase/sync")
def supabase_sync_incidents():
    """Sync active Mumbai incidents to Supabase database."""
    incidents = engine.get_active_incidents()
    return sync_active_incidents(incidents)

@app.get("/api/weather")
def get_live_weather(lat: Optional[float] = None, lon: Optional[float] = None, force_refresh: bool = False):
    """Real Open-Meteo live Mumbai weather connector with honest data provenance and caching."""
    return weather_service.get_weather(lat, lon, force_refresh)

@app.get("/api/sources/health")
def get_sources_health():
    """Phase 6 / Phase 4: Data source health, connectivity, and resilience monitoring."""
    return source_health_monitor.get_all_sources_health()

@app.post("/api/incidents/report")
def submit_citizen_incident_report(report: CitizenReportSubmission):
    """Phase 4.D: Authenticated citizen hazard report submission with coordinate validation and spam controls."""
    res = citizen_report_manager.submit_report(report)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Invalid report submission"))
    return res

class TestSmsPayload(BaseModel):
    phone: str = Field(..., description="10-digit Indian mobile number")
    message: Optional[str] = "UrbanPulse: Rain and waterlogging alert along your commute corridor."
    simulate: Optional[bool] = False
    user_code: Optional[str] = None

@app.post("/api/alerts/test-sms")
def test_sms_dispatch(payload: TestSmsPayload):
    """Phase 13.E: Protected test-sms dispatch endpoint with Indian phone normalization, simulation fallback, and rate limiting."""
    if payload.simulate:
        save_user_notification({
            "user_code": payload.user_code or "COMMUTER",
            "alert_type": "SCHEDULED",
            "title": "Morning Commute SMS (Simulated)",
            "message": payload.message or "UrbanPulse: Good morning! Your commute route Borivali->Dadar is CLEAR. Est. travel: ~65m. Safe journey!",
            "severity": "LOW",
            "channels": ["SMS", "IN_APP"],
            "delivery_status": "DELIVERED",
            "is_read": False,
            "evidence_summary": {"source": "FAST2SMS_SIMULATION", "recipient": payload.phone}
        })
        return {
            "success": True,
            "status": "simulated_delivered",
            "message": f"Simulated SMS alert delivered to Notification Center for {sms_service.mask_phone(payload.phone)}.",
            "recipient": payload.phone,
            "message_content": payload.message
        }

    result = sms_service.send_commute_sms_alert(payload.phone, payload.message or "UrbanPulse test alert")
    
    # Mirror into user notifications for audit trail
    if payload.user_code:
        provider_name = result.get("provider", "SMS")
        save_user_notification({
            "user_code": payload.user_code,
            "alert_type": "SCHEDULED",
            "title": f"{provider_name} Commute Alert Dispatch",
            "message": payload.message or "UrbanPulse test alert",
            "severity": "MODERATE",
            "channels": ["SMS"],
            "delivery_status": "DELIVERED" if result.get("success") else "FAILED",
            "is_read": False,
            "evidence_summary": {"provider": provider_name, "result": result}
        })

    return result

@app.get("/api/alerts/sms-provider-status")
def get_sms_provider_status():
    """Returns SMS gateway configuration, active provider (TextBee / Fast2SMS), and connected device status."""
    return sms_service.get_provider_status()

class ScanAndNotifyRequest(BaseModel):
    user_code: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None

@app.post("/api/alerts/scan-and-notify")
async def scan_and_notify_commuter(req: ScanAndNotifyRequest):
    """
    Immediate corridor hazard scan and multi-channel dispatch (SMS + Email + In-App) on login or on-demand request.
    """
    user = None
    if req.user_code:
        user = get_user_by_code(req.user_code)
    elif req.email:
        for u in get_all_users():
            if (u.get("email") or "").lower() == req.email.lower():
                user = u
                break

    if not user:
        user = {
            "id": "anon",
            "user_code": req.user_code or "COMMUTER",
            "full_name": "Commuter",
            "email": req.email or "",
            "phone": req.phone or "",
            "default_origin": req.origin or "Borivali (West)",
            "default_destination": req.destination or "Dadar (West)",
            "preferred_mode": "DRIVE"
        }
    else:
        if req.phone:
            user["phone"] = req.phone
        if req.origin:
            user["default_origin"] = req.origin
        if req.destination:
            user["default_destination"] = req.destination

    res = await commute_scheduler.evaluate_and_send_user_alert(user, is_login_or_manual=True)
    return {"status": "SUCCESS", "details": res}

class TestEmailPayload(BaseModel):
    email: str
    name: Optional[str] = "Commuter"
    origin: Optional[str] = "Borivali"
    destination: Optional[str] = "Dadar"

@app.post("/api/alerts/test-email")
def test_email_dispatch(payload: TestEmailPayload):
    """Sends a test emergency commute corridor email alert."""
    result = email_service.send_commute_alert_email(
        to_email=payload.email,
        user_name=payload.name or "Commuter",
        alert_title=f"Emergency Commute Corridor Alert ({payload.origin} -> {payload.destination})",
        alert_message="UrbanPulse AI: Real-time incident detection active for your commute route. Dispatches immediately upon hazard detection or login.",
        corridor_info={
            "origin": payload.origin or "Borivali",
            "destination": payload.destination or "Dadar",
            "recommended_mode": "Western Railway Train",
            "time_saved_min": 15,
            "eta_min": 45
        },
        severity="MAJOR"
    )
    return result

@app.post("/api/scheduler/trigger")
async def trigger_scheduler_check():
    """Trigger on-demand check for real-time commute alerts."""
    dispatched = await commute_scheduler.check_and_dispatch_realtime_alerts()
    return {"status": "SUCCESS", "dispatched_count": len(dispatched), "details": dispatched}

# -----------------------------------------------------------------------------
# PERSONALIZED ALERT GENERATION & NOTIFICATION CENTER ENDPOINTS (Objective 1, 2, 5, 8)
# -----------------------------------------------------------------------------
class EvaluateAlertsRequest(BaseModel):
    user_code: Optional[str] = None
    email: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None

class MarkAllReadRequest(BaseModel):
    user_identifier: str

@app.get("/api/notifications/{user_identifier}")
def fetch_user_notifications(user_identifier: str, limit: int = 50):
    """Fetch notifications for authenticated commuter with unread counter."""
    notifs = get_user_notifications(user_identifier, limit=limit)
    unread_count = get_unread_notifications_count(user_identifier)
    return {
        "user_identifier": user_identifier,
        "notifications": notifs,
        "total_count": len(notifs),
        "unread_count": unread_count
    }

@app.post("/api/notifications/{notification_id}/read")
def read_notification(notification_id: str, user_identifier: Optional[str] = None):
    """Mark a notification as read."""
    success = mark_notification_as_read(notification_id, user_identifier=user_identifier)
    return {"status": "SUCCESS" if success else "NOT_FOUND", "notification_id": notification_id}

@app.post("/api/notifications/read-all")
def read_all_notifications(req: MarkAllReadRequest):
    """Mark all notifications as read for a user."""
    updated = mark_all_notifications_as_read(req.user_identifier)
    return {"status": "SUCCESS", "updated_count": updated}

@app.post("/api/alerts/evaluate-now")
def evaluate_user_alerts(req: EvaluateAlertsRequest):
    """
    On-demand personalized location-based alert generation.
    Evaluates active incidents against commuter's GPS coordinates, saved places, and route corridor.
    """
    user = None
    if req.user_code:
        user = get_user_by_code(req.user_code)
    elif req.email:
        from backend.auth_service import get_all_users
        for u in get_all_users():
            if (u.get("email") or "").lower() == req.email.lower():
                user = u
                break
    
    if not user:
        from backend.auth_service import get_all_users
        all_u = get_all_users()
        user = all_u[0] if all_u else {
            "id": "anon",
            "user_code": req.user_code or "COMMUTER",
            "full_name": "Active Commuter",
            "default_origin": "Ashokvan (Borivali East)",
            "default_destination": "Versova (Andheri West)",
            "alert_preferences": {"notify_nearby": True, "notify_commute": True}
        }

    coords = None
    if req.lat is not None and req.lon is not None:
        coords = {"lat": req.lat, "lon": req.lon}

    new_alerts = alert_engine.evaluate_alerts_for_user(user, current_coords=coords)
    user_id = user.get("user_code") or user.get("id") or "COMMUTER"
    all_notifs = get_user_notifications(user_id)

    return {
        "status": "SUCCESS",
        "user_code": user_id,
        "newly_generated_alerts": new_alerts,
        "newly_generated_count": len(new_alerts),
        "total_notifications": all_notifs,
        "unread_count": get_unread_notifications_count(user_id)
    }

@app.post("/api/alerts/test-trigger")
def sample_trigger_alert(req: EvaluateAlertsRequest):
    """Generates a verified demonstration alert for testing in-app notification center and push."""
    user_id = req.user_code or "COMMUTER_DEMO"
    import time
    demo_notif = {
        "user_code": user_id,
        "alert_type": "COMMUTE",
        "title": "Commute Corridor Alert (MAJOR): Andheri Subway Waterlogging",
        "message": "Heavy water accumulation (45cm) reported at Andheri Subway. Diversions active via Gokhale Bridge.",
        "severity": "MAJOR",
        "channels": ["IN_APP", "WEB_PUSH"],
        "delivery_status": "DELIVERED",
        "is_read": False,
        "missing_data_qualification": None,
        "evidence_summary": {"source": "MUMBAI_DISASTER_CAD_112", "confidence_score": 0.92},
        "idempotency_key": f"test_{user_id}_{int(time.time())}"
    }
    save_user_notification(demo_notif)
    return {"status": "SUCCESS", "notification": demo_notif}

@app.get("/api/simulation/timeline")
def get_simulation_timeline():
    """Act One: Simulated incoming event feed from 08:05 to 08:10 IST."""
    return engine.get_simulation_timeline()

@app.get("/api/incidents")
def get_incidents():
    return {"incidents": engine.get_active_incidents()}

@app.get("/api/incident/{incident_id}/graph")
def get_incident_graph(incident_id: str):
    return engine.get_cascading_evidence_graph(incident_id)

@app.get("/api/incident/{incident_id}/ledger")
def get_incident_ledger(incident_id: str):
    return engine.get_evidence_confidence_ledger(incident_id)

# -----------------------------------------------------------------------------
# CORE CAUSAL INTELLIGENCE & MUNICIPAL RESPONSE ENDPOINTS (Phase 13)
# -----------------------------------------------------------------------------
class OperatorBriefingRequest(BaseModel):
    query: Optional[str] = None

class CreateWorkOrderDraftRequest(BaseModel):
    incident_id: str = "INC_MUM_20260715_01"
    operator_name: Optional[str] = "OPERATOR_DESK"

class UpdateWorkOrderRequest(BaseModel):
    status: Optional[str] = None
    problem_description: Optional[str] = None
    recommended_response: Optional[str] = None
    priority: Optional[str] = None
    department: Optional[str] = None
    operator_notes: Optional[str] = None
    actor: Optional[str] = "OPERATOR"
    role: Optional[str] = "OPERATOR"

class WorkOrderDecisionRequest(BaseModel):
    actor: Optional[str] = "OPERATOR"
    role: Optional[str] = "OPERATOR"
    notes: Optional[str] = None

@app.get("/api/incident/{incident_id}/causal-analysis")
def get_incident_causal_analysis(incident_id: str):
    """Requirement 2: Explicit Root-Cause vs. Symptom Distinction."""
    return engine.get_root_cause_analysis(incident_id)

@app.get("/api/incident/{incident_id}/timeline-scrubber")
def get_incident_timeline_scrubber(incident_id: str):
    """Requirement 3: Interactive Signal Arrival Timeline."""
    return {
        "incident_id": incident_id,
        "events": engine.get_timeline_scrubber_events(incident_id)
    }

@app.get("/api/incident/{incident_id}/reconstruct-step")
def reconstruct_incident_step(incident_id: str, step: int = 8):
    """Requirement 3: Historical state reconstruction without mutating production data."""
    return engine.reconstruct_incident_state_at_step(incident_id, step)

@app.get("/api/incident/{incident_id}/comparison")
def get_incident_comparison(incident_id: str):
    """Requirement 4: Before vs. After comparison (Hackathon Centerpiece)."""
    return engine.get_before_vs_after_comparison(incident_id)

@app.post("/api/incident/{incident_id}/operator-briefing")
def post_incident_operator_briefing(incident_id: str, req: OperatorBriefingRequest = None):
    """Requirement 5: Explainable Operator Briefing with optional query filter."""
    query = req.query if req else None
    return engine.generate_explainable_operator_briefing(incident_id, query)

@app.get("/api/incident/{incident_id}/operator-briefing")
def get_incident_operator_briefing_get(incident_id: str, query: Optional[str] = None):
    """Requirement 5: Explainable Operator Briefing GET accessor."""
    return engine.generate_explainable_operator_briefing(incident_id, query)

@app.post("/api/work-orders/draft")
def create_draft_work_order(req: CreateWorkOrderDraftRequest):
    """Requirement 6: Generate municipal work order draft."""
    return engine.generate_draft_work_order(req.incident_id, req.operator_name)

@app.get("/api/work-orders")
def list_municipal_work_orders(incident_id: Optional[str] = None):
    """Requirement 6: List municipal work orders."""
    return {"work_orders": get_municipal_work_orders(incident_id)}

@app.get("/api/work-orders/{work_order_id}")
def get_single_work_order(work_order_id: str):
    """Requirement 6: Retrieve single municipal work order with audit trail."""
    order = get_municipal_work_order_by_id(work_order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Work order not found")
    audit = get_work_order_audit_logs(work_order_id)
    return {"work_order": order, "audit_trail": audit}

@app.patch("/api/work-orders/{work_order_id}")
def update_work_order_route(work_order_id: str, req: UpdateWorkOrderRequest):
    """Requirement 6: Edit or update draft municipal work order."""
    updates = req.dict(exclude_unset=True, exclude={"actor", "role"})
    try:
        updated = update_municipal_work_order(work_order_id, updates, req.actor, req.role)
        if not updated:
            raise HTTPException(status_code=404, detail="Work order not found")
        return {"status": "SUCCESS", "work_order": updated}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))

@app.post("/api/work-orders/{work_order_id}/approve")
def approve_work_order_route(work_order_id: str, req: WorkOrderDecisionRequest):
    """Requirement 6: Approve municipal work order with role authorization."""
    try:
        updated = update_municipal_work_order(
            work_order_id,
            {"status": "APPROVED", "operator_notes": req.notes or "Approved for field response verification."},
            actor=req.actor,
            role=req.role
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Work order not found")
        return {"status": "SUCCESS", "message": "Work order approved successfully.", "work_order": updated}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))

@app.post("/api/work-orders/{work_order_id}/reject")
def reject_work_order_route(work_order_id: str, req: WorkOrderDecisionRequest):
    """Requirement 6: Reject municipal work order with role authorization."""
    try:
        updated = update_municipal_work_order(
            work_order_id,
            {"status": "REJECTED", "operator_notes": req.notes or "Rejected by reviewer."},
            actor=req.actor,
            role=req.role
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Work order not found")
        return {"status": "SUCCESS", "message": "Work order rejected.", "work_order": updated}
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))

@app.get("/api/work-orders/{work_order_id}/audit-trail")
def get_work_order_audit_route(work_order_id: str):
    """Requirement 6: Retrieve chronological audit trail."""
    return {"work_order_id": work_order_id, "audit_trail": get_work_order_audit_logs(work_order_id)}


@app.get("/api/commute-fingerprint/{user_id}")
def get_commute_fingerprint(user_id: str):
    return engine.get_personal_commute_fingerprint(user_id)

class ProximityHazardsRequest(BaseModel):
    lat: float = 19.1875
    lon: float = 72.8504
    radius_km: float = 8.0

@app.post("/api/nearby/hazards")
def post_nearby_hazards(req: ProximityHazardsRequest):
    """Calculates live proximity radar hazards from user's current GPS location."""
    return engine.get_proximity_incident_analysis(req.lat, req.lon, req.radius_km)

@app.get("/api/nearby/hazards")
def get_nearby_hazards(
    lat: float = 19.1875,
    lon: float = 72.8504,
    radius_km: float = 8.0
):
    """Returns proximity hazard scan sorted by distance for user's GPS coordinates."""
    return engine.get_proximity_incident_analysis(lat, lon, radius_km)


class CommuteEvaluationRequest(BaseModel):
    origin: str
    destination: str
    preferred_mode: str = "MOTORCYCLE"
    name: Optional[str] = "Sahil"
    corridor_threshold_m: Optional[float] = 350.0

@app.post("/api/commute/evaluate")
def evaluate_commute(req: CommuteEvaluationRequest):
    result = engine.evaluate_custom_commute(
        origin=req.origin,
        destination=req.destination,
        preferred_mode=req.preferred_mode,
        user_name=req.name or "Commuter",
        corridor_threshold_m=req.corridor_threshold_m or 350.0
    )
    save_commute_query_record({
        "user_name": req.name or "Commuter",
        "origin": req.origin,
        "destination": req.destination,
        "preferred_mode": req.preferred_mode,
        "calculated_travel_time_min": result.get("current_eta_min", 0),
        "recommended_mode": result.get("recommended_mode", ""),
        "net_time_saved_min": result.get("net_time_saved_min", 0),
        "incident_exposure_score": result.get("incident_exposure_score", "MODERATE"),
        "nearby_hazards_count": result.get("nearby_hazards_count", 0),
        "intersecting_incidents": result.get("intersecting_incidents", []),
        "itinerary_details": result.get("travel_options", []),
        "corridor_threshold_m": req.corridor_threshold_m or 350.0,
        "route_geometry": result.get("map_route", {}),
        "alternative_routes": result.get("alternative_routes", []),
        "is_authoritative_google_route": result.get("is_authoritative_google_route", True),
        "routing_provider": result.get("routing_provider", "GOOGLE_ROUTES_API_V2")
    })
    return result

@app.get("/api/commute/evaluate")
def evaluate_commute_get(
    origin: str = "Ashokvan (Borivali East)",
    destination: str = "RGIT (Versova)",
    preferred_mode: str = "MOTORCYCLE",
    name: str = "Sahil",
    corridor_threshold_m: float = 350.0
):
    result = engine.evaluate_custom_commute(
        origin=origin,
        destination=destination,
        preferred_mode=preferred_mode,
        user_name=name,
        corridor_threshold_m=corridor_threshold_m
    )
    save_commute_query_record({
        "user_name": name,
        "origin": origin,
        "destination": destination,
        "preferred_mode": preferred_mode,
        "calculated_travel_time_min": result.get("current_eta_min", 0),
        "recommended_mode": result.get("recommended_mode", ""),
        "net_time_saved_min": result.get("net_time_saved_min", 0),
        "incident_exposure_score": result.get("incident_exposure_score", "MODERATE"),
        "nearby_hazards_count": result.get("nearby_hazards_count", 0),
        "intersecting_incidents": result.get("intersecting_incidents", []),
        "itinerary_details": result.get("travel_options", []),
        "corridor_threshold_m": corridor_threshold_m,
        "route_geometry": result.get("map_route", {}),
        "alternative_routes": result.get("alternative_routes", []),
        "is_authoritative_google_route": result.get("is_authoritative_google_route", True),
        "routing_provider": result.get("routing_provider", "GOOGLE_ROUTES_API_V2")
    })
    return result

@app.get("/api/routes/google")
def get_google_route_geometry(
    origin: str = "Ashokvan (Borivali East)",
    destination: str = "RGIT (Versova)",
    travel_mode: str = "DRIVE",
    corridor_threshold_m: float = 350.0
):
    """Direct Google Routes API v2 route geometry and corridor inspection endpoint."""
    orig_c, o_ok, o_msg = engine.google_routing.resolve_location(origin)
    dest_c, d_ok, d_msg = engine.google_routing.resolve_location(destination)
    if not o_ok or not d_ok:
        return {
            "status": "LOCATION_RESOLUTION_FAILED",
            "success": False,
            "origin_resolved": o_ok,
            "destination_resolved": d_ok,
            "message": f"Could not resolve locations: {o_msg if not o_ok else ''} {d_msg if not d_ok else ''}"
        }
    routes_res = engine.google_routing.compute_routes(orig_c, dest_c, travel_mode=travel_mode, compute_alternatives=True)
    if not routes_res.get("success"):
        return routes_res
    
    # Match against active incidents
    active_incidents = engine.get_active_incidents()
    routes = routes_res.get("routes", [])
    primary_polyline = routes[0]["polyline_coords"] if routes else []
    corridor_eval = engine.corridor_matcher.match_incidents_to_route(
        route_polyline=primary_polyline,
        incidents=active_incidents,
        travel_mode=travel_mode,
        corridor_threshold_m=corridor_threshold_m
    )

    return {
        "status": "SUCCESS",
        "provider": "GOOGLE_ROUTES_API_V2",
        "origin_coordinates": orig_c,
        "destination_coordinates": dest_c,
        "total_routes_count": len(routes),
        "corridor_threshold_m": corridor_threshold_m,
        "route_relevant_incidents": corridor_eval["route_relevant_incidents"],
        "route_relevant_count": len(corridor_eval["route_relevant_incidents"]),
        "off_route_hazards_count": len(corridor_eval["off_route_hazards"]),
        "routes": routes
    }

@app.get("/api/commute/locations")
def get_commute_locations():
    return {"locations": engine.get_commute_locations()}

@app.get("/api/incident/{incident_id}/briefing")
def get_incident_briefing(incident_id: str):
    return engine.generate_llm_operator_briefing(incident_id)

@app.get("/api/map/layers")
def get_map_layers():
    return engine.get_map_layers()

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    try:
        events = engine.df_events.to_dict(orient="records")
        idx = 0
        while True:
            ev = events[idx % len(events)]
            payload = {
                "event_id": ev["event_id"],
                "source": ev["source"],
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "event_type": ev["event_type"],
                "measured_value": ev["measured_value"],
                "raw_text": ev["raw_text_payload"],
                "reliability": float(ev["source_reliability"])
            }
            await websocket.send_json(payload)
            idx += 1
            await asyncio.sleep(2.5)  # Stream every 2.5 seconds
    except WebSocketDisconnect:
        pass

@app.get("/api/stream/events")
async def sse_event_stream():
    """Server-Sent Events fallback streaming ticker."""
    async def event_generator():
        events = engine.df_events.to_dict(orient="records")
        idx = 0
        while True:
            ev = events[idx % len(events)]
            data = json.dumps({
                "event_id": ev["event_id"],
                "source": ev["source"],
                "timestamp": datetime.now().strftime("%H:%M:%S"),
                "event_type": ev["event_type"],
                "measured_value": ev["measured_value"],
                "raw_text": ev["raw_text_payload"],
                "reliability": float(ev["source_reliability"])
            })
            yield f"data: {data}\n\n"
            idx += 1
            await asyncio.sleep(2.5)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/api/users")
def get_users():
    return {"users": engine.df_users.to_dict(orient="records")}

@app.get("/api/stations")
def get_stations():
    return {"stations": engine.df_stations.to_dict(orient="records")}

@app.get("/api/sensors")
def get_sensors():
    return {
        "sensors": engine.df_sensors.to_dict(orient="records"),
        "offline_sensors": list(engine.offline_sensors)
    }

@app.get("/api/complaints")
def get_complaints():
    return {"complaints": engine.df_complaints.head(25).to_dict(orient="records")}

@app.get("/api/models/metrics")
def get_models_metrics():
    return engine.get_models_performance()

@app.post("/api/replay/action")
def trigger_replay_action(req: ReplayActionRequest):
    result = engine.execute_replay_action(req.action_type, req.payload or {})
    ledger = engine.get_evidence_confidence_ledger()
    record_replay_action_log(req.action_type, req.payload or {}, ledger)
    return {
        "result": result,
        "active_offline_sensors": list(engine.offline_sensors),
        "replay_log": engine.replay_state_log[-10:],
        "updated_ledger": ledger
    }

# Mount frontend directory for static serving
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
elif os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
