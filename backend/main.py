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
    sync_active_incidents
)
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
def auth_login(req: LoginRequest):
    """Authenticate commuter with email/user_code/phone and password."""
    try:
        user = login_user(req.identifier, req.password)
        return {"status": "SUCCESS", "user": user}
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

@app.post("/api/alerts/test-sms")
def test_sms_dispatch(payload: TestSmsPayload):
    """Phase 13.E: Protected test-sms dispatch endpoint with Indian phone normalization and rate limiting."""
    result = sms_service.send_commute_sms_alert(payload.phone, payload.message or "UrbanPulse test alert")
    if not result.get("success"):
        # If disabled or mocked, returns 200 with structured status
        if result.get("status") in ["mock_accepted", "duplicate_suppressed"]:
            return result
        raise HTTPException(status_code=400, detail=result.get("error") or "SMS dispatch rejected")
    return result

@app.post("/api/scheduler/trigger")
async def trigger_scheduler_check():
    """Trigger on-demand check for scheduled morning commute alerts."""
    dispatched = await commute_scheduler.check_and_dispatch_due_alerts()
    return {"status": "SUCCESS", "dispatched_count": len(dispatched), "details": dispatched}

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
