import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
