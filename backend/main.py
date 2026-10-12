import os
import json
import asyncio
from datetime import datetime
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any

from backend.engine import IncidentIntelligenceEngine

app = FastAPI(
    title="CodeAstra: Multimodal Urban Incident Intelligence Engine",
    description="24-hour multimodal incident correlation, evidence graph, confidence ledger, and personalized commute alert API.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = IncidentIntelligenceEngine()

class ReplayActionRequest(BaseModel):
    action_type: str
    payload: Optional[Dict[str, Any]] = None

@app.get("/api/health")
def health_check():
    return {"status": "ONLINE", "system": "CodeAstra Intelligence Engine", "version": "2.0.0"}

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

class CommuteEvaluationRequest(BaseModel):
    origin: str
    destination: str
    preferred_mode: str = "TRAIN"
    name: Optional[str] = "Sahil"

@app.post("/api/commute/evaluate")
def evaluate_commute(req: CommuteEvaluationRequest):
    return engine.evaluate_custom_commute(req.origin, req.destination, req.preferred_mode, req.name or "Commuter")

@app.get("/api/commute/evaluate")
def evaluate_commute_get(
    origin: str = "Ashokvan (Borivali East)",
    destination: str = "RGIT (Versova)",
    preferred_mode: str = "TRAIN",
    name: str = "Sahil"
):
    return engine.evaluate_custom_commute(origin, destination, preferred_mode, name)

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
    return {
        "result": result,
        "active_offline_sensors": list(engine.offline_sensors),
        "replay_log": engine.replay_state_log[-10:]
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
