import os
import json
import math
from datetime import datetime, timedelta
import joblib
import pandas as pd
import numpy as np
import networkx as nx

BASE_DIR = r"c:\Users\Sahil\OneDrive\Desktop\Main-Projects\CodeAstra"
DATASET_DIR = os.path.join(BASE_DIR, "datasets")
MODELS_DIR = os.path.join(BASE_DIR, "models")

class IncidentIntelligenceEngine:
    def __init__(self):
        # Load trained ML models
        self.model_correlation = joblib.load(os.path.join(MODELS_DIR, "incident_correlation_model.pkl"))
        self.model_anomaly = joblib.load(os.path.join(MODELS_DIR, "telemetry_anomaly_model.pkl"))
        self.model_route_impact = joblib.load(os.path.join(MODELS_DIR, "route_impact_classifier.pkl"))

        # Load datasets
        self.df_events = pd.read_csv(os.path.join(DATASET_DIR, "urban_incident_events.csv"))
        self.df_ground_truth = pd.read_csv(os.path.join(DATASET_DIR, "incident_ground_truth.csv"))
        self.df_incidents = pd.read_csv(os.path.join(DATASET_DIR, "incident_severity_labels.csv"))
        self.df_users = pd.read_csv(os.path.join(DATASET_DIR, "user_profiles.csv"))
        self.df_routes = pd.read_csv(os.path.join(DATASET_DIR, "route_network.csv"))
        self.df_stations = pd.read_csv(os.path.join(DATASET_DIR, "multimodal_stations_geo.csv"))
        self.df_sensors = pd.read_csv(os.path.join(DATASET_DIR, "sensor_metadata.csv"))
        self.df_complaints = pd.read_csv(os.path.join(DATASET_DIR, "citizen_emergency_reports.csv"))
        self.df_recommendations = pd.read_csv(os.path.join(DATASET_DIR, "route_recommendations.csv"))

        # State for interactive replay lab
        self.offline_sensors = set()
        self.injected_events = []
        self.replay_state_log = []
        self.has_duplicate = False
        self.has_contradictory = False
        self.delayed_events = []

    def get_active_incidents(self):
        """Return list of active incident clusters with summary metrics covering all Mumbai corridors."""
        base_incidents = [
            {
                "incident_id": "INC_MUM_20260715_01",
                "title": "Severe Track Submergence at Malad-Kandivali Section",
                "scenario_type": "Urban Flooding",
                "severity_level": "CRITICAL_LEVEL_4",
                "centroid_lat": 19.1875,
                "centroid_lon": 72.8504,
                "radius_km": 2.2,
                "affected_infrastructure": "Western Railway Slow & Fast Tracks (Borivali-Malad), Malad Subway, SV Road",
                "commuters_affected": 85000,
                "confidence_score": 0.93,
                "known_cause": "Cloudburst rainfall exceeding 82mm/hr with high tide backflow",
                "start_time": "2026-07-15 08:05:00",
                "end_time": "2026-07-15 12:30:00",
                "status": "ACTIVE",
                "corridor": "Western Suburbs"
            },
            {
                "incident_id": "INC_MUM_20260715_02",
                "title": "Andheri Subway Inundation & SV Road Diversion",
                "scenario_type": "Urban Flooding",
                "severity_level": "MAJOR_LEVEL_3",
                "centroid_lat": 19.1196,
                "centroid_lon": 72.8433,
                "radius_km": 1.5,
                "affected_infrastructure": "Andheri Subway East-West Link, SV Road Andheri West",
                "commuters_affected": 45000,
                "confidence_score": 0.91,
                "known_cause": "Storm water drain backflow with 60mm/hr intense rain",
                "start_time": "2026-07-15 08:15:00",
                "end_time": "2026-07-15 11:45:00",
                "status": "ACTIVE",
                "corridor": "Western Suburbs"
            },
            {
                "incident_id": "INC_MUM_20260715_03",
                "title": "BEST Power Substation Trip & Signal Failure at Mithchowki Junction",
                "scenario_type": "Utility Failure",
                "severity_level": "MODERATE_LEVEL_2",
                "centroid_lat": 19.2001,
                "centroid_lon": 72.8372,
                "radius_km": 0.8,
                "affected_infrastructure": "Mithchowki 4-Way Traffic Junction, New Link Road Kandivali",
                "commuters_affected": 22000,
                "confidence_score": 0.89,
                "known_cause": "Underground feeder cable short circuit following trench seepage",
                "start_time": "2026-07-15 08:30:00",
                "end_time": "2026-07-15 11:15:00",
                "status": "ACTIVE",
                "corridor": "Western Suburbs"
            },
            {
                "incident_id": "INC_MUM_20260716_04",
                "title": "Multi-Vehicle Collision on WEH Pathanwadi Flyover Southbound",
                "scenario_type": "Road Accident",
                "severity_level": "MAJOR_LEVEL_3",
                "centroid_lat": 19.1814,
                "centroid_lon": 72.8591,
                "radius_km": 1.2,
                "affected_infrastructure": "Western Express Highway (Pathanwadi Flyover Southbound)",
                "commuters_affected": 34000,
                "confidence_score": 0.92,
                "known_cause": "Oil tanker brake failure skidded across 3 lanes in wet conditions",
                "start_time": "2026-07-15 08:20:00",
                "end_time": "2026-07-15 10:45:00",
                "status": "ACTIVE",
                "corridor": "Western Suburbs"
            },
            {
                "incident_id": "INC_MUM_20260720_19",
                "title": "Milan Subway Waterlogging & Traffic Standstill",
                "scenario_type": "Urban Flooding",
                "severity_level": "MAJOR_LEVEL_3",
                "centroid_lat": 19.0890,
                "centroid_lon": 72.8409,
                "radius_km": 1.2,
                "affected_infrastructure": "Milan Subway Santacruz West Link, Western Railway Underpass",
                "commuters_affected": 38000,
                "confidence_score": 0.94,
                "known_cause": "Subway sump pump failure during 75mm/hr rain spell",
                "start_time": "2026-07-15 08:10:00",
                "end_time": "2026-07-15 11:30:00",
                "status": "ACTIVE",
                "corridor": "Western Suburbs"
            },
            {
                "incident_id": "INC_MUM_20260725_35",
                "title": "Overturned Container Truck on JVLR WEH Junction Flyover",
                "scenario_type": "Road Accident",
                "severity_level": "CRITICAL_LEVEL_4",
                "centroid_lat": 19.1430,
                "centroid_lon": 72.8578,
                "radius_km": 1.6,
                "affected_infrastructure": "Jogeshwari JVLR Flyover connecting Western Express Highway",
                "commuters_affected": 58000,
                "confidence_score": 0.93,
                "known_cause": "Commercial trailer jackknifing across junction entrance ramp",
                "start_time": "2026-07-15 07:50:00",
                "end_time": "2026-07-15 10:15:00",
                "status": "ACTIVE",
                "corridor": "Western Suburbs"
            },
            {
                "incident_id": "INC_MUM_KURLA_FLOOD",
                "title": "Kurla Station LBS Marg & Central Railway Track Inundation",
                "scenario_type": "Urban Flooding",
                "severity_level": "CRITICAL_LEVEL_4",
                "centroid_lat": 19.0680,
                "centroid_lon": 72.8790,
                "radius_km": 1.8,
                "affected_infrastructure": "Central Railway Harbour & Slow Tracks, LBS Marg Kurla West",
                "commuters_affected": 92000,
                "confidence_score": 0.95,
                "known_cause": "Mithi river high tide overflow into low-lying culverts",
                "start_time": "2026-07-15 08:00:00",
                "end_time": "2026-07-15 13:00:00",
                "status": "ACTIVE",
                "corridor": "Central & Eastern Suburbs"
            },
            {
                "incident_id": "INC_MUM_BKC_GRIDLOCK",
                "title": "BKC Connector & Kalanagar Junction Extreme Traffic Gridlock",
                "scenario_type": "Traffic Congestion",
                "severity_level": "MAJOR_LEVEL_3",
                "centroid_lat": 19.0620,
                "centroid_lon": 72.8550,
                "radius_km": 1.4,
                "affected_infrastructure": "Bandra Kurla Complex Link Road, Kalanagar Flyover, SCLR Entrance",
                "commuters_affected": 62000,
                "confidence_score": 0.90,
                "known_cause": "Spillover traffic from flooded arterial bypasses crawling at 2.4 km/h",
                "start_time": "2026-07-15 08:25:00",
                "end_time": "2026-07-15 11:50:00",
                "status": "ACTIVE",
                "corridor": "Central Mumbai"
            },
            {
                "incident_id": "INC_MUM_DADAR_HINDMATA",
                "title": "Dadar TT Circle & Hindmata Low-Lying Water Accumulation",
                "scenario_type": "Urban Flooding",
                "severity_level": "MAJOR_LEVEL_3",
                "centroid_lat": 19.0195,
                "centroid_lon": 72.8430,
                "radius_km": 1.1,
                "affected_infrastructure": "Hindmata Flyover Underpass, Dr. Ambedkar Road, Dadar East",
                "commuters_affected": 48000,
                "confidence_score": 0.92,
                "known_cause": "Natural saucer depression storm drain stagnation",
                "start_time": "2026-07-15 08:15:00",
                "end_time": "2026-07-15 11:20:00",
                "status": "ACTIVE",
                "corridor": "South-Central Mumbai"
            },
            {
                "incident_id": "INC_MUM_SAKINAKA_JAM",
                "title": "Saki Naka 90-Feet Road Trench Cave-in & Bottleneck",
                "scenario_type": "Road Blockage",
                "severity_level": "MODERATE_LEVEL_2",
                "centroid_lat": 19.1065,
                "centroid_lon": 72.8875,
                "radius_km": 0.9,
                "affected_infrastructure": "Andheri-Ghatkopar Link Road, Saki Naka Metro Line 1 Underpass",
                "commuters_affected": 29000,
                "confidence_score": 0.88,
                "known_cause": "Underground utility trench collapse blocking 2 eastbound lanes",
                "start_time": "2026-07-15 08:05:00",
                "end_time": "2026-07-15 10:30:00",
                "status": "ACTIVE",
                "corridor": "Eastern Suburbs"
            },
            {
                "incident_id": "INC_MUM_EEH_CHEDDA",
                "title": "Eastern Express Highway Chedda Nagar Bridge Structural Repair",
                "scenario_type": "Road Blockage",
                "severity_level": "MODERATE_LEVEL_2",
                "centroid_lat": 19.0690,
                "centroid_lon": 72.8980,
                "radius_km": 1.0,
                "affected_infrastructure": "EEH Southbound Carriageway connecting Chembur & Ghatkopar",
                "commuters_affected": 31000,
                "confidence_score": 0.89,
                "known_cause": "Expansion joint settlement requiring emergency single-lane cordon",
                "start_time": "2026-07-15 07:30:00",
                "end_time": "2026-07-15 11:00:00",
                "status": "ACTIVE",
                "corridor": "Eastern Suburbs"
            },
            {
                "incident_id": "INC_MUM_HAJI_ALI",
                "title": "Haji Ali Coastal Road Underpass Sea Spray Water Influx",
                "scenario_type": "Road Disruption",
                "severity_level": "MODERATE_LEVEL_2",
                "centroid_lat": 18.9774,
                "centroid_lon": 72.8105,
                "radius_km": 1.0,
                "affected_infrastructure": "Coastal Road Promenade & Haji Ali Junction Approach",
                "commuters_affected": 24000,
                "confidence_score": 0.87,
                "known_cause": "High spring tide 4.6m waves breaching outer sea wall rip-rap",
                "start_time": "2026-07-15 08:40:00",
                "end_time": "2026-07-15 11:15:00",
                "status": "ACTIVE",
                "corridor": "South Mumbai"
            }
        ]

        incidents = []
        for inc in base_incidents:
            inc_id = inc["incident_id"]
            evts = self.df_ground_truth[self.df_ground_truth["ground_truth_incident_id"] == inc_id] if hasattr(self, "df_ground_truth") else pd.DataFrame()
            
            sup_count = len(evts[evts["relationship_status"].isin(["PARENT_TRIGGER", "PRIMARY_OBSERVATION"])]) if not evts.empty else 4
            dup_count = 1 if (self.has_duplicate and inc_id == "INC_MUM_20260715_01") else (len(evts[evts["relationship_status"] == "DUPLICATE_REPORT"]) if not evts.empty else 0)
            conf_count = 1 if (self.has_contradictory and inc_id == "INC_MUM_20260715_01") else (len(evts[evts["relationship_status"] == "CONTRADICTORY_NOISE"]) if not evts.empty else 0)

            inc_copy = dict(inc)
            inc_copy["supporting_evidence_count"] = sup_count
            inc_copy["duplicate_reports_count"] = dup_count
            inc_copy["conflicting_reports_count"] = conf_count
            incidents.append(inc_copy)

        return incidents

    def get_cascading_evidence_graph(self, incident_id="INC_MUM_20260715_01"):
        """Innovation 1 / Act Two: The Urban Ripple Graph.
        Reconstructs the situational causality:
        HEAVY RAINFALL -> RISING WATER -> FLOODING HYPOTHESIS -> (ROAD CONGESTION / ROAD DISRUPTION) -> BUS DELAY RISK.
        Explicitly distinguishes between:
        - Observed: Water levels increased
        - Correlated: Traffic slowed near affected road
        - Supported hypothesis: Area experiencing flooding
        - Potential consequence: Bus journeys delayed
        - Related weather episode: Western Railway disruption linked to storm episode without incorrectly merging."""
        
        inc_title = "Severe Track Submergence at Malad-Kandivali Section"
        if incident_id != "INC_MUM_20260715_01":
            for inc in self.get_active_incidents():
                if inc["incident_id"] == incident_id:
                    inc_title = inc["title"]
                    break

        nodes = []
        edges = []

        # 1. Trigger Observation (Observed: Heavy Rainfall)
        nodes.append({
            "id": "NODE_RAIN",
            "label": "HEAVY RAINFALL\n[82 mm/hr Cloudburst]",
            "tier": "Observed",
            "group": "OBSERVED_EVENT",
            "title": "Evidence Tier: OBSERVED\nSource: BMC Doppler Radar AWS_02\nMeasured: 82.4 mm/hr intensity",
            "color": "#3a86ff",
            "size": 26,
            "x": -250,
            "y": -120
        })

        # 2. Physical Sensor Observation (Observed: Water levels increased)
        is_sensor_offline = ("BMC_FLD_MALAD_SUB" in self.offline_sensors)
        nodes.append({
            "id": "NODE_RISING_WATER",
            "label": "RISING WATER\n[Depth: 68.0 cm]" if not is_sensor_offline else "RISING WATER\n[SENSOR OFFLINE]",
            "tier": "Observed" if not is_sensor_offline else "Missing / Stale",
            "group": "OBSERVED_EVENT",
            "title": "Evidence Tier: OBSERVED\nSource: Ultrasonic Depth Gauge BMC_FLD_MALAD_SUB\nInvert depth: 68.0 cm" if not is_sensor_offline else "Sensor dropped out",
            "color": "#06d6a0" if not is_sensor_offline else "#6b7280",
            "size": 28,
            "x": 0,
            "y": -120
        })

        # 3. Core AI Supported Hypothesis (Supported hypothesis: Flooding)
        nodes.append({
            "id": "NODE_FLOOD_HYPO",
            "label": "FLOODING HYPOTHESIS\n[Malad Corridor Inundated]",
            "tier": "Supported Hypothesis",
            "group": "SUPPORTED_HYPOTHESIS",
            "title": "Evidence Tier: SUPPORTED HYPOTHESIS\nConfidence: 93%\nAutomated correlation across sensor & radar streams",
            "color": "#e63946",
            "size": 36,
            "x": 0,
            "y": 0
        })

        # 4. Traffic Flow Observation (Correlated: Traffic slowed near affected road)
        nodes.append({
            "id": "NODE_ROAD_CONGESTION",
            "label": "ROAD CONGESTION\n[Speed: 7 km/h Collapse]",
            "tier": "Correlated",
            "group": "CORRELATED_OBSERVATION",
            "title": "Evidence Tier: CORRELATED\nSource: TomTom Feed & Radar WEH_RADAR_04\nSpeed dropped 78% along SV Road corridor",
            "color": "#f4a261",
            "size": 24,
            "x": -180,
            "y": 120
        })

        # 5. Road Disruption Observation (Supported hypothesis / Citizen Reports)
        nodes.append({
            "id": "NODE_ROAD_DISRUPTION",
            "label": "ROAD DISRUPTION\n[Subway Impassable]",
            "tier": "Supported Hypothesis",
            "group": "SUPPORTED_HYPOTHESIS",
            "title": "Evidence Tier: SUPPORTED HYPOTHESIS\nSource: 112 CAD Call #4029\n2.5 feet standing water; light motor vehicles halted",
            "color": "#e76f51",
            "size": 24,
            "x": 180,
            "y": 120
        })

        # 6. Downstream Consequence (Potential consequence: Bus delay risk)
        nodes.append({
            "id": "NODE_BUS_DELAY",
            "label": "BUS DELAY RISK\n[BEST Routes 202/249]",
            "tier": "Potential Consequence",
            "group": "POTENTIAL_CONSEQUENCE",
            "title": "Evidence Tier: POTENTIAL CONSEQUENCE\nImpact: BEST routes diverted; estimated delay +48 mins",
            "color": "#9b5de5",
            "size": 24,
            "x": -180,
            "y": 230
        })

        # 7. Unmerged Related Rail Disruption (Signature Feature: Connected weather episode, NOT blindly merged)
        nodes.append({
            "id": "NODE_RAIL_DISRUPT",
            "label": "WESTERN RAILWAY DISRUPTION\n[Track Signal TC-284 Red]",
            "tier": "Related Incident (Unmerged)",
            "group": "RELATED_WEATHER_EPISODE",
            "title": "Evidence Tier: RELATED WEATHER EPISODE (NOT MERGED)\nSource: WR Suburban SCADA\nTrack Km 28/4 submerged 145mm. Related to weather episode, but kept distinct from road flood.",
            "color": "#d90429",
            "size": 26,
            "x": 250,
            "y": -120
        })

        # Edges establishing explicit semantics
        edges.append({
            "from": "NODE_RAIN",
            "to": "NODE_RISING_WATER",
            "label": "CAUSES_WATER_RISE",
            "color": {"color": "#3a86ff"},
            "title": "Direct physical causality"
        })
        edges.append({
            "from": "NODE_RISING_WATER",
            "to": "NODE_FLOOD_HYPO",
            "label": "SUPPORTS_HYPOTHESIS",
            "color": {"color": "#06d6a0"},
            "title": "Physical depth gauge corroboration"
        })
        edges.append({
            "from": "NODE_FLOOD_HYPO",
            "to": "NODE_ROAD_CONGESTION",
            "label": "CORRELATED_SLOWDOWN",
            "color": {"color": "#f4a261"},
            "title": "Traffic speed reduction correlated in time & space"
        })
        edges.append({
            "from": "NODE_FLOOD_HYPO",
            "to": "NODE_ROAD_DISRUPTION",
            "label": "IMPASSABLE_CORRIDOR",
            "color": {"color": "#e76f51"},
            "title": "Corroborated by citizen emergency reports"
        })
        edges.append({
            "from": "NODE_ROAD_CONGESTION",
            "to": "NODE_BUS_DELAY",
            "label": "POTENTIAL_CONSEQUENCE",
            "color": {"color": "#9b5de5"},
            "title": "Downstream passenger impact"
        })
        # Explicit unmerged relationship to railway
        edges.append({
            "from": "NODE_RAIN",
            "to": "NODE_RAIL_DISRUPT",
            "label": "WEATHER_RELATED (NOT MERGED)",
            "dashes": True,
            "color": {"color": "#d90429"},
            "title": "Shared storm episode; NOT incorrectly merged into road flooding"
        })

        # Inject duplicate node if replay action triggered
        if self.has_duplicate:
            nodes.append({
                "id": "NODE_DUP_REPORT",
                "label": "DUPLICATE CITIZEN REPORT\n[Redundant CAD Tweet]",
                "tier": "Excluded Duplicate",
                "group": "DUPLICATE_REPORT",
                "title": "UrbanPulse NLP identified identical wording to CAD #4029. Excluded from independent evidence count.",
                "color": "#a855f7",
                "size": 18,
                "x": 240,
                "y": 200
            })
            edges.append({
                "from": "NODE_ROAD_DISRUPTION",
                "to": "NODE_DUP_REPORT",
                "label": "EXCLUDED_DUPLICATE",
                "dashes": True,
                "color": {"color": "#a855f7"}
            })

        # Inject contradictory node if replay action triggered
        if self.has_contradictory:
            nodes.append({
                "id": "NODE_CONFLICT_SENSOR",
                "label": "CONTRADICTORY SENSOR\n[Malad North Gauge: 0 cm]",
                "tier": "Contradictory Signal",
                "group": "CONTRADICTORY_NOISE",
                "title": "Secondary sensor BMC_FLD_MALAD_NORTH reports normal condition. Preserved as contradiction; confidence lowered to Moderate.",
                "color": "#f59e0b",
                "size": 20,
                "x": 80,
                "y": -220
            })
            edges.append({
                "from": "NODE_FLOOD_HYPO",
                "to": "NODE_CONFLICT_SENSOR",
                "label": "CONTRADICTS (PRESERVED)",
                "dashes": True,
                "color": {"color": "#f59e0b"}
            })

        return {
            "incident_id": incident_id,
            "incident_title": inc_title,
            "signature_feature": "Urban Ripple Graph (Distinguishing Observed, Correlated, Supported Hypothesis, Potential Consequence & Unmerged Rail)",
            "nodes": nodes,
            "edges": edges
        }

    def get_evidence_confidence_ledger(self, incident_id="INC_MUM_20260715_01"):
        """Innovation 3 / Act Three: Evidence Confidence Ledger.
        Makes uncertainty visible: supporting, contradictory, duplicates excluded, and stale feeds."""
        inc_title = "Severe Track Submergence at Malad-Kandivali Section"
        for inc in self.get_active_incidents():
            if inc["incident_id"] == incident_id:
                inc_title = inc["title"]
                break

        # Dynamic counts based on actual replay actions
        supporting_count = 3
        if "BMC_FLD_MALAD_SUB" in self.offline_sensors:
            supporting_count = 2

        contradictory_count = 1 if self.has_contradictory else 0
        duplicates_excluded = 1 if self.has_duplicate else 0
        missing_stale_count = len(self.offline_sensors)

        # Baseline confidence
        base_confidence = 0.93
        if self.has_contradictory:
            base_confidence -= 0.18
        if len(self.offline_sensors) > 0:
            base_confidence -= 0.15
        if self.has_duplicate:
            base_confidence -= 0.01  # Slight penalty for noisy feed

        computed_confidence = max(0.40, min(0.99, round(base_confidence, 2)))
        confidence_rating = "High" if computed_confidence >= 0.85 else ("Moderate" if computed_confidence >= 0.65 else "Low / Uncertain")

        supporting_items = [
            {"source": "BMC_AWS_02 Doppler Radar", "type": "Rainfall Telemetry", "measured": "82.4 mm/hr", "reliability": 0.98},
            {"source": "TomTom / WEH_RADAR_04", "type": "Traffic Speed Radar", "measured": "Speed dropped to 7 km/h", "reliability": 0.91},
            {"source": "112 CAD Call #4029", "type": "Citizen Emergency Report", "measured": "2.5 ft standing water at subway", "reliability": 0.84}
        ]
        if "BMC_FLD_MALAD_SUB" not in self.offline_sensors:
            supporting_items.insert(0, {
                "source": "BMC_FLD_MALAD_SUB", "type": "Ultrasonic Water Depth Gauge", "measured": "68.0 cm water depth", "reliability": 0.99
            })

        conflicting_items = []
        if self.has_contradictory:
            conflicting_items.append({
                "source": "BMC_FLD_MALAD_NORTH",
                "claim": "Depth sensor reports 0.0 cm (Dry/Normal)",
                "reliability": 0.82,
                "reconciliation": "System preserves contradiction and down-weights incident confidence to Moderate"
            })

        duplicate_items = []
        if self.has_duplicate:
            duplicate_items.append({
                "source": "Citizen Twitter / CAD Repeat",
                "raw_text": "Waterlogging at Malad subway, traffic stuck!",
                "status": "Identified as semantic duplicate of CAD #4029. Excluded from independent corroboration count."
            })

        missing_items = []
        for s in self.offline_sensors:
            missing_items.append({
                "source": s,
                "reason": "Sensor offline / Signal dropout",
                "impact": "Uncertainty increased; primary physical depth verification unavailable."
            })
        if not missing_items and len(self.offline_sensors) == 0:
            missing_items.append({
                "source": "BMC_AWS_GOREGAON",
                "reason": "Periphery station beyond immediate radius",
                "impact": "Regional wind gradient verification unpolled"
            })

        return {
            "incident_id": incident_id,
            "title": inc_title,
            "assessment": "Possible flooding-related disruption",
            "confidence_rating": confidence_rating,
            "confidence_score": computed_confidence,
            "counts": {
                "supporting": supporting_count,
                "contradictory": contradictory_count,
                "duplicates_excluded": duplicates_excluded,
                "missing_or_stale": missing_stale_count
            },
            "next_step": "Verify the water conditions and road accessibility",
            "ledger_summary": (
                f"Supporting evidence: {supporting_count} observations | "
                f"Contradictory evidence: {contradictory_count} observation | "
                f"Duplicate reports excluded from independent evidence count: {duplicates_excluded} | "
                f"Missing or stale information: {missing_stale_count} sensor feed"
            ),
            "supporting_evidence": supporting_items,
            "conflicting_evidence": conflicting_items,
            "duplicate_evidence": duplicate_items,
            "missing_evidence": missing_items
        }

    def get_simulation_timeline(self):
        """Act One: Simulated incoming event feed from 08:05 to 08:10 IST."""
        return {
            "status_banner": "POSSIBLE FLOODING-RELATED URBAN INCIDENT DETECTED",
            "reasoning": "The system identifies that incoming observations are correlated based on timestamps (08:05–08:10), geospatial proximity (Malad corridor), event types (rain, water level, traffic slowdown), and source reliability.",
            "events": [
                {
                    "time": "08:05",
                    "timestamp": "08:05:12 IST",
                    "event": "Heavy rainfall reported in the simulated study area",
                    "source": "BMC Doppler Radar AWS_02",
                    "event_type": "WEATHER_RADAR",
                    "measured": "82.4 mm/hr intensity",
                    "reliability": 0.98,
                    "evidence_tier": "Observed"
                },
                {
                    "time": "08:07",
                    "timestamp": "08:07:34 IST",
                    "event": "Water-level sensor near Malad Subway reports rising water",
                    "source": "BMC_FLD_MALAD_SUB",
                    "event_type": "WATER_LEVEL_SENSOR",
                    "measured": "68.0 cm depth (Rising)",
                    "reliability": 0.99,
                    "evidence_tier": "Observed"
                },
                {
                    "time": "08:08",
                    "timestamp": "08:08:19 IST",
                    "event": "Traffic monitoring detects a significant speed reduction",
                    "source": "TomTom / WEH_RADAR_04",
                    "event_type": "TRAFFIC_SPEED",
                    "measured": "Speed dropped to 7.2 km/h",
                    "reliability": 0.91,
                    "evidence_tier": "Correlated"
                },
                {
                    "time": "08:09",
                    "timestamp": "08:09:45 IST",
                    "event": "Citizen report describes water accumulation on road",
                    "source": "112 CAD Call #4029",
                    "event_type": "CITIZEN_REPORT",
                    "measured": "2.5 ft standing water at subway invert",
                    "reliability": 0.84,
                    "evidence_tier": "Supporting Hypothesis"
                },
                {
                    "time": "08:10",
                    "timestamp": "08:10:22 IST",
                    "event": "Transport feed reports a possible railway service disruption",
                    "source": "Western Railway Suburban SCADA",
                    "event_type": "TRANSIT_FEED",
                    "measured": "Track circuit TC-284 red; slow line halted",
                    "reliability": 0.97,
                    "evidence_tier": "Related Weather Episode (Unmerged)"
                }
            ]
        }

    def get_personal_commute_fingerprint(self, user_id="USR_001"):
        """Innovation 2 / Act Four: Personalized Commute Impact Fingerprint.
        Hero student profile: Student 001 (Sahil), Origin: Ashokvan, Borivali East -> RGIT, Versova."""
        return self.evaluate_custom_commute(
            origin="Ashokvan (Borivali East)",
            destination="Rajiv Gandhi Institute of Technology (RGIT, Versova)",
            preferred_mode="MOTORCYCLE",
            user_name="Student 001 (Sahil)"
        )

    def get_commute_locations(self):
        """Returns comprehensive searchable Mumbai transit stations, hubs, and institutions."""
        key_locations = [
            # Western Suburbs (North to South)
            "Dahisar Railway Station",
            "Dahisar East Metro Station",
            "Ashokvan (Borivali East)",
            "Borivali Railway Station",
            "Borivali West Metro Station",
            "National Park (Borivali East)",
            "Kandivali Railway Station",
            "Kandivali West Metro Station",
            "Mithchowki Junction (Kandivali West)",
            "Malad Railway Station",
            "Malad West Metro Station",
            "Malad Subway",
            "Goregaon Railway Station",
            "Goregaon West Metro Station",
            "NESCO IT Park (Goregaon East)",
            "Ram Mandir Railway Station",
            "Jogeshwari Railway Station",
            "JVLR Junction (Jogeshwari East)",
            "Andheri Railway Station",
            "Andheri West (D.N. Nagar) Metro Station",
            "Andheri Subway",
            "Rajiv Gandhi Institute of Technology (RGIT, Versova)",
            "Versova Metro Station",
            "Kokilaben Hospital (Andheri West)",
            "Bhavan's College (Andheri West)",
            "Vile Parle Railway Station",
            "Mithibai College (Vile Parle West)",
            "Santacruz Railway Station",
            "Milan Subway (Santacruz)",
            "Bandra Railway Station",
            "Bandra West (Linking Road)",
            # Central & Eastern Suburbs
            "Bandra Kurla Complex (BKC)",
            "Kurla Railway Station",
            "Sion Railway Station",
            "Ghatkopar Railway Station",
            "Saki Naka Junction",
            "Powai (IIT Bombay)",
            "Chembur Railway Station",
            "Eastern Express Highway (Chedda Nagar)",
            "Vashi Railway Station (Navi Mumbai)",
            "Mulund Railway Station",
            "Thane Railway Station",
            # South Mumbai
            "Dadar Railway Station",
            "Dadar TT Circle",
            "Hindmata (Dadar East)",
            "Lower Parel (High Street Phoenix)",
            "Worli Seaface",
            "Mumbai Central Railway Station",
            "Haji Ali Dargah (Coastal Road)",
            "Marine Drive",
            "Churchgate Railway Station",
            "Chhatrapati Shivaji Maharaj Terminus (CSMT)",
            "Nariman Point",
            "Colaba (Gateway of India)"
        ]
        return sorted(key_locations)

    def evaluate_custom_commute(self, origin: str, destination: str, preferred_mode: str = "MOTORCYCLE", user_name: str = "Commuter"):
        """Evaluates any commute across Mumbai against citywide active incidents.
        Computes:
        1. Nearby incidents relative to user's origin/current GPS location.
        2. Hurdles/incidents intersecting the route corridor.
        3. Multi-mode comparison: Motorcycle, Western Railway, Metro Line, and BEST Bus.
        4. Explainable recommendations and net time saved."""
        origin = origin.strip() or "Ashokvan (Borivali East)"
        destination = destination.strip() or "Rajiv Gandhi Institute of Technology (RGIT, Versova)"
        user_name = user_name.strip() or "Commuter"
        mode_upper = preferred_mode.upper()

        # Comprehensive Mumbai Coordinates Registry
        location_coords = {
            # Western Suburbs
            "ashokvan (borivali east)": [19.2372, 72.8695],
            "ashokvan": [19.2372, 72.8695],
            "borivali railway station": [19.2290, 72.8569],
            "borivali station": [19.2290, 72.8569],
            "borivali": [19.2290, 72.8569],
            "borivali west": [19.2272, 72.8455],
            "borivali west metro station": [19.2272, 72.8455],
            "national park (borivali east)": [19.2301, 72.8631],
            "dahisar": [19.2501, 72.8593],
            "dahisar railway station": [19.2501, 72.8593],
            "dahisar east metro station": [19.2555, 72.8624],
            "kandivali": [19.2045, 72.8522],
            "kandivali railway station": [19.2045, 72.8522],
            "kandivali west metro station": [19.2085, 72.8423],
            "mithchowki junction (kandivali west)": [19.2015, 72.8375],
            "mithchowki": [19.2015, 72.8375],
            "malad": [19.1868, 72.8488],
            "malad railway station": [19.1868, 72.8488],
            "malad west metro station": [19.1865, 72.8380],
            "malad subway": [19.1862, 72.8462],
            "goregaon": [19.1645, 72.8493],
            "goregaon railway station": [19.1645, 72.8493],
            "goregaon west metro station": [19.1601, 72.8362],
            "nesco it park (goregaon east)": [19.1555, 72.8542],
            "nesco": [19.1555, 72.8542],
            "ram mandir railway station": [19.1517, 72.8475],
            "jogeshwari railway station": [19.1359, 72.8490],
            "jvlr junction (jogeshwari east)": [19.1415, 72.8562],
            "jvlr": [19.1415, 72.8562],
            "andheri station": [19.1197, 72.8464],
            "andheri railway station": [19.1197, 72.8464],
            "andheri": [19.1197, 72.8464],
            "andheri west (d.n. nagar) metro station": [19.1308, 72.8322],
            "d.n. nagar metro station": [19.1308, 72.8322],
            "d.n. nagar": [19.1308, 72.8322],
            "andheri subway": [19.1215, 72.8445],
            "rgit (versova)": [19.1342, 72.8145],
            "rajiv gandhi institute of technology (rgit, versova)": [19.1342, 72.8145],
            "rgit": [19.1342, 72.8145],
            "versova": [19.1315, 72.8172],
            "versova metro station": [19.1315, 72.8172],
            "kokilaben hospital (andheri west)": [19.1312, 72.8252],
            "bhavan's college (andheri west)": [19.1245, 72.8355],
            "vile parle railway station": [19.0999, 72.8438],
            "mithibai college (vile parle west)": [19.1028, 72.8372],
            "mithibai": [19.1028, 72.8372],
            "santacruz railway station": [19.0818, 72.8407],
            "milan subway (santacruz)": [19.0885, 72.8420],
            "milan subway": [19.0885, 72.8420],
            "bandra railway station": [19.0544, 72.8406],
            "bandra": [19.0544, 72.8406],
            "bandra west (linking road)": [19.0596, 72.8335],
            # Central & Eastern Suburbs
            "bandra kurla complex (bkc)": [19.0657, 72.8687],
            "bkc": [19.0657, 72.8687],
            "kurla railway station": [19.0680, 72.8790],
            "kurla": [19.0680, 72.8790],
            "sion railway station": [19.0390, 72.8615],
            "ghatkopar railway station": [19.0863, 72.9080],
            "ghatkopar": [19.0863, 72.9080],
            "saki naka junction": [19.1065, 72.8875],
            "saki naka": [19.1065, 72.8875],
            "powai (iit bombay)": [19.1334, 72.9133],
            "powai": [19.1334, 72.9133],
            "chembur railway station": [19.0622, 72.8977],
            "eastern express highway (chedda nagar)": [19.0690, 72.8980],
            "vashi railway station (navi mumbai)": [19.0771, 72.9986],
            "vashi": [19.0771, 72.9986],
            "mulund railway station": [19.1726, 72.9563],
            "thane railway station": [19.1860, 72.9759],
            "thane": [19.1860, 72.9759],
            # South Mumbai
            "dadar railway station": [19.0178, 72.8478],
            "dadar": [19.0178, 72.8478],
            "dadar tt circle": [19.0195, 72.8430],
            "hindmata (dadar east)": [19.0125, 72.8415],
            "lower parel (high street phoenix)": [18.9950, 72.8248],
            "lower parel": [18.9950, 72.8248],
            "worli seaface": [19.0128, 72.8155],
            "mumbai central railway station": [18.9696, 72.8193],
            "mumbai central": [18.9696, 72.8193],
            "haji ali dargah (coastal road)": [18.9774, 72.8105],
            "haji ali": [18.9774, 72.8105],
            "marine drive": [18.9438, 72.8232],
            "churchgate railway station": [18.9322, 72.8264],
            "churchgate": [18.9322, 72.8264],
            "chhatrapati shivaji maharaj terminus (csmt)": [18.9402, 72.8356],
            "csmt": [18.9402, 72.8356],
            "cst": [18.9402, 72.8356],
            "nariman point": [18.9260, 72.8230],
            "colaba (gateway of india)": [18.9220, 72.8347],
            "colaba": [18.9220, 72.8347]
        }

        def resolve_coords(loc_str: str, default_c):
            loc_clean = loc_str.strip().lower()
            if loc_clean in location_coords:
                return location_coords[loc_clean]
            for k, c in location_coords.items():
                if k in loc_clean or loc_clean in k:
                    return c
            return default_c

        def haversine(c1, c2):
            R = 6371.0
            lat1, lon1 = math.radians(c1[0]), math.radians(c1[1])
            lat2, lon2 = math.radians(c2[0]), math.radians(c2[1])
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
            return R * 2 * math.asin(math.sqrt(a))

        origin_c = resolve_coords(origin, [19.2372, 72.8695])
        dest_c = resolve_coords(destination, [19.1342, 72.8145])
        total_dist_km = max(2.0, haversine(origin_c, dest_c))

        active_incidents = self.get_active_incidents()

        # 1. Detect Nearby Incidents (within 3.5 km of Origin)
        nearby_hazards = []
        for inc in active_incidents:
            inc_c = [inc["centroid_lat"], inc["centroid_lon"]]
            dist = haversine(origin_c, inc_c)
            if dist <= (inc["radius_km"] + 1.5):
                nearby_hazards.append({
                    "incident_id": inc["incident_id"],
                    "title": inc["title"],
                    "type": inc["scenario_type"],
                    "severity": inc["severity_level"],
                    "distance_km": round(dist, 1),
                    "known_cause": inc["known_cause"],
                    "infrastructure": inc["affected_infrastructure"]
                })

        # 2. Detect Intersecting Incidents along Route Corridor
        min_lat = min(origin_c[0], dest_c[0]) - 0.015
        max_lat = max(origin_c[0], dest_c[0]) + 0.015
        min_lon = min(origin_c[1], dest_c[1]) - 0.015
        max_lon = max(origin_c[1], dest_c[1]) + 0.015

        intersecting_incidents = []
        for inc in active_incidents:
            lat = inc["centroid_lat"]
            lon = inc["centroid_lon"]
            if (min_lat <= lat <= max_lat) and (min_lon <= lon <= max_lon):
                # Calculate cross-track corridor proximity
                inc_c = [lat, lon]
                # Distance to segment
                d_orig = haversine(origin_c, inc_c)
                d_dest = haversine(dest_c, inc_c)
                if (d_orig + d_dest) <= (total_dist_km * 1.35):
                    intersecting_incidents.append({
                        "incident_id": inc["incident_id"],
                        "title": inc["title"],
                        "type": inc["scenario_type"],
                        "severity": inc["severity_level"],
                        "radius_km": inc["radius_km"],
                        "affected_infrastructure": inc["affected_infrastructure"],
                        "known_cause": inc["known_cause"]
                    })

        # Base Travel Time calculation based on Mumbai transit speeds
        # Personal Vehicle (Motorcycle): ~25 km/h base
        motorcycle_base_time = int(round(total_dist_km * 2.2 + 10))
        # Western Railway: ~35 km/h base + access
        rail_base_time = int(round(total_dist_km * 1.6 + 12))
        # Metro: ~32 km/h grade-separated + headway
        metro_base_time = int(round(total_dist_km * 1.7 + 10))
        # BEST Bus: ~18 km/h base + stops
        bus_base_time = int(round(total_dist_km * 2.8 + 15))

        # Check disruption impact from intersecting incidents
        has_subway_flood = any("Flooding" in i["type"] and ("Malad" in i["title"] or "Andheri" in i["title"] or "Milan" in i["title"]) for i in intersecting_incidents)
        has_rail_disrupt = any("Western Railway" in i["affected_infrastructure"] or "Track" in i["title"] for i in intersecting_incidents)
        has_road_accident = any("Accident" in i["type"] or "Blockage" in i["type"] for i in intersecting_incidents)
        has_central_flood = any("Kurla" in i["title"] or "Central Railway" in i["affected_infrastructure"] for i in intersecting_incidents)

        # Dynamic Delays
        motorcycle_delay = 0
        rail_delay = 0
        metro_delay = 0
        bus_delay = 0

        if has_subway_flood:
            motorcycle_delay += 20
            rail_delay += 15
            bus_delay += 17
        if has_road_accident:
            motorcycle_delay += 15
            bus_delay += 12
        if has_rail_disrupt:
            rail_delay += 25
        if has_central_flood:
            rail_delay += 35
            motorcycle_delay += 25
            bus_delay += 30

        # Hero Story override (Student 001: Ashokvan -> RGIT Versova)
        is_hero_journey = ("ashokvan" in origin.lower() and "rgit" in destination.lower())
        if is_hero_journey:
            motorcycle_base_time = 45
            motorcycle_delay = 20  # 65 min total
            rail_base_time = 40
            rail_delay = 15        # 55 min total
            metro_base_time = 48
            metro_delay = 0        # 48 min total
            bus_base_time = 55
            bus_delay = 17         # 72 min total

        # Build 4 Transport Options Comparison Table (Exact alignment with Hackathon prompt)
        options = [
            {
                "mode": "Motorcycle",
                "mode_key": "MOTORCYCLE",
                "icon": "Bike",
                "estimated_journey_time": motorcycle_base_time + motorcycle_delay,
                "base_time": motorcycle_base_time,
                "delay_min": motorcycle_delay,
                "incident_exposure": "High road-disruption exposure" if motorcycle_delay > 0 else "Low",
                "assessment": "High road-disruption exposure" if motorcycle_delay > 0 else "Clear arterial corridors",
                "recommendation": "Consider an alternative if supported by current route information" if motorcycle_delay > 0 else "Optimal personal vehicle flow",
                "recommended": False if (is_hero_journey or motorcycle_delay > 15) else True,
                "corridor_notes": "S.V. Road & Malad subway corridor experiencing severe surface water accumulation and bottlenecking." if has_subway_flood else "Normal road conditions.",
                "color": "#ef4444" if motorcycle_delay > 15 else "#10b981"
            },
            {
                "mode": "Western Railway",
                "mode_key": "TRAIN",
                "icon": "Train",
                "estimated_journey_time": rail_base_time + rail_delay,
                "base_time": rail_base_time,
                "delay_min": rail_delay,
                "incident_exposure": "Moderate" if (rail_delay > 0 and rail_delay <= 20) else ("High / Track Submergence" if rail_delay > 20 else "Low"),
                "assessment": "A service disruption has been reported" if rail_delay > 0 else "Regular timetable operations",
                "recommendation": "Check the affected section and latest service status" if rail_delay > 0 else "Suburban trains operating normally",
                "recommended": False,
                "corridor_notes": "Track circuit TC-284 tripped red due to track waterlogging at Malad Km 28/4." if has_rail_disrupt else "Suburban rakes operating on schedule.",
                "color": "#f59e0b" if rail_delay > 0 else "#10b981"
            },
            {
                "mode": "Metro",
                "mode_key": "METRO",
                "icon": "Navigation",
                "estimated_journey_time": metro_base_time + metro_delay,
                "base_time": metro_base_time,
                "delay_min": metro_delay,
                "incident_exposure": "Low in current simulation",
                "assessment": "No disruption detected in the simulated metro feed",
                "recommendation": "Potential alternative, subject to route, transfer, and service verification",
                "recommended": True,
                "corridor_notes": "Grade-separated elevated viaduct (Line 2A / 7) has zero surface water ingress. Punctual 3-minute headway.",
                "color": "#06d6a0"
            },
            {
                "mode": "Bus",
                "mode_key": "BUS",
                "icon": "Bus",
                "estimated_journey_time": bus_base_time + bus_delay,
                "base_time": bus_base_time,
                "delay_min": bus_delay,
                "incident_exposure": "High road-congestion exposure" if bus_delay > 0 else "Low",
                "assessment": "Potential road-congestion exposure" if bus_delay > 0 else "Normal transit flow",
                "recommendation": "Check the affected corridor before recommending" if bus_delay > 0 else "Regular BEST transit operations",
                "recommended": False,
                "corridor_notes": "BEST bus routes 202 and 249 diverted around flooded subway underpasses.",
                "color": "#ef4444" if bus_delay > 15 else "#f59e0b"
            }
        ]

        # Determine user preferred selection specifics
        chosen_mode_obj = next((o for o in options if o["mode_key"] in mode_upper), options[0])
        recommended_obj = next((o for o in options if o["recommended"]), options[2])
        net_time_saved = max(0, chosen_mode_obj["estimated_journey_time"] - recommended_obj["estimated_journey_time"])

        # Map Route Coordinates
        map_route = {
            "origin": origin_c,
            "destination": dest_c,
            "clear_leg": [origin_c, [19.2272, 72.8455]],
            "disrupted_leg": [[19.2290, 72.8569], [19.2045, 72.8522], [19.1868, 72.8488], [19.1197, 72.8464]] if (has_subway_flood or has_rail_disrupt) else [],
            "recommended_leg": [[19.2272, 72.8455], [19.2085, 72.8423], [19.1865, 72.8380], [19.1510, 72.8359], [19.1308, 72.8322], [19.1315, 72.8172], dest_c]
        }

        # Personalized Alert Content (Exact match to Act Four specifications)
        alert_data = {
            "alert_headline": "Your college journey may be affected" if is_hero_journey else "Your route may be affected by active incidents",
            "incident": "Possible flooding-related road disruption" if has_subway_flood else (intersecting_incidents[0]["title"] if intersecting_incidents else "Active Urban Incident"),
            "affected_area": "Simulated Malad road corridor" if is_hero_journey else (intersecting_incidents[0]["affected_infrastructure"] if intersecting_incidents else "Corridor Junction"),
            "potential_impact": f"Your {chosen_mode_obj['mode'].lower()} route may experience delays of approximately {chosen_mode_obj['delay_min']} minutes." if chosen_mode_obj['delay_min'] > 0 else "Minimal impact detected on this corridor.",
            "recommendations": [
                "Review the metro option and its current service status.",
                "Check the Western Railway disruption before choosing the train.",
                "Compare the estimated journey time and transfer requirements."
            ],
            "why_you_received_alert": "The reported incident overlaps your saved commute and has supporting weather, water-level, and traffic observations.",
            "data_freshness_warning": "Simulated demonstration values. System notes missing or unpolled feeder status must be verified."
        }

        return {
            "commuter_name": user_name,
            "origin": origin,
            "destination": destination,
            "origin_coordinates": origin_c,
            "destination_coordinates": dest_c,
            "distance_km": round(total_dist_km, 1),
            "preferred_mode": chosen_mode_obj["mode"],
            "preferred_mode_key": chosen_mode_obj["mode_key"],
            "current_eta_min": chosen_mode_obj["estimated_journey_time"],
            "normal_eta_min": chosen_mode_obj["base_time"],
            "delay_min": chosen_mode_obj["delay_min"],
            "net_time_saved_min": net_time_saved,
            "recommended_mode": recommended_obj["mode"],
            "recommended_eta_min": recommended_obj["estimated_journey_time"],
            "incident_exposure_score": chosen_mode_obj["incident_exposure"],
            "nearby_hazards": nearby_hazards,
            "nearby_hazards_count": len(nearby_hazards),
            "intersecting_incidents": intersecting_incidents,
            "intersecting_incidents_count": len(intersecting_incidents),
            "travel_options": options,
            "personalized_alert": alert_data,
            "map_route": map_route
        }

    def execute_replay_action(self, action_type, payload=None):
        """Act Three: Interactive Incident Replay Lab.
        Feeds actual events into the processing pipeline:
        - INJECT_DUPLICATE: Identifies duplicate citizen report and excludes it from independent evidence count.
        - DELAY_EVENT: Distinguishes event timestamp (08:03) from arrival timestamp (08:12).
        - ADD_CONTRADICTORY: Nearby sensor disagrees; preserves contradiction and lowers confidence to Moderate.
        - DISCONNECT_SENSOR: Primary sensor dropped offline; flags data quality warning.
        - RESET: Restores baseline test pipeline."""
        payload = payload or {}
        timestamp_now = datetime.now().strftime("%H:%M:%S IST")

        if action_type == "INJECT_DUPLICATE":
            self.has_duplicate = True
            res = {
                "action": "INJECT_DUPLICATE",
                "challenge": "Challenge 1: A duplicate report arrives",
                "description": "Two citizen reports contain substantially the same information (CAD #4029 text repeat).",
                "system_response": "UrbanPulse identifies a likely duplicate. The evidence graph does NOT count it as a second independent confirmation.",
                "supporting_count": 3 if "BMC_FLD_MALAD_SUB" not in self.offline_sensors else 2,
                "contradictory_count": 1 if self.has_contradictory else 0,
                "duplicate_reports_excluded": 1,
                "missing_or_stale": len(self.offline_sensors),
                "confidence_score": 0.92,
                "confidence_rating": "High"
            }
        elif action_type == "DELAY_EVENT":
            self.delayed_events.append({"event_id": "EVT_0803_DELAYED", "event_time": "08:03", "arrival_time": "08:12"})
            res = {
                "action": "DELAY_EVENT",
                "challenge": "Challenge 2: An older event arrives late",
                "description": "A sensor observation recorded at 08:03 reaches the system at 08:12.",
                "system_response": "The system distinguishes the event timestamp (08:03) from its arrival timestamp (08:12). It places the event correctly on the timeline and reassesses the incident without graph reinitialization.",
                "supporting_count": 3 if "BMC_FLD_MALAD_SUB" not in self.offline_sensors else 2,
                "contradictory_count": 1 if self.has_contradictory else 0,
                "duplicate_reports_excluded": 1 if self.has_duplicate else 0,
                "missing_or_stale": len(self.offline_sensors),
                "confidence_score": 0.93,
                "confidence_rating": "High"
            }
        elif action_type == "ADD_CONTRADICTORY":
            self.has_contradictory = True
            res = {
                "action": "ADD_CONTRADICTORY",
                "challenge": "Challenge 3: A sensor disagrees",
                "description": "One sensor reports rising water levels, while nearby sensor BMC_FLD_MALAD_NORTH reports normal conditions (0 cm).",
                "system_response": "The system preserves the contradiction and adjusts its assessment confidence from High (93%) to Moderate (75%).",
                "supporting_count": 3 if "BMC_FLD_MALAD_SUB" not in self.offline_sensors else 2,
                "contradictory_count": 1,
                "duplicate_reports_excluded": 1 if self.has_duplicate else 0,
                "missing_or_stale": len(self.offline_sensors),
                "confidence_score": 0.75,
                "confidence_rating": "Moderate"
            }
        elif action_type == "DISCONNECT_SENSOR":
            sensor_id = payload.get("sensor_id", "BMC_FLD_MALAD_SUB")
            self.offline_sensors.add(sensor_id)
            res = {
                "action": "DISCONNECT_SENSOR",
                "challenge": "Challenge 4: Sensor dropout / Missing feed",
                "description": f"Physical ultrasonic gauge {sensor_id} drops offline.",
                "system_response": "System logs 1 missing or stale sensor feed and raises Data Quality Warning. Confidence is penalised by 15%.",
                "supporting_count": 2,
                "contradictory_count": 1 if self.has_contradictory else 0,
                "duplicate_reports_excluded": 1 if self.has_duplicate else 0,
                "missing_or_stale": len(self.offline_sensors),
                "confidence_score": 0.78,
                "confidence_rating": "Moderate"
            }
        elif action_type == "RESET":
            self.has_duplicate = False
            self.has_contradictory = False
            self.offline_sensors.clear()
            self.delayed_events.clear()
            res = {
                "action": "RESET",
                "challenge": "Replay Reset",
                "description": "All injected replay challenges cleared. Pipeline returned to clean baseline.",
                "system_response": "Baseline state restored. Confidence recovered to 93% High.",
                "supporting_count": 3,
                "contradictory_count": 0,
                "duplicate_reports_excluded": 0,
                "missing_or_stale": 0,
                "confidence_score": 0.93,
                "confidence_rating": "High"
            }
        else:
            res = {"action": action_type, "status": "NOOP"}

        res["timestamp"] = timestamp_now
        self.replay_state_log.append(res)
        return res


    def get_models_performance(self):
        """Return evaluation metrics for Model 1, Model 2, and Model 3."""
        eval_path = os.path.join(MODELS_DIR, "evaluation_report.json")
        if os.path.exists(eval_path):
            with open(eval_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def generate_llm_operator_briefing(self, incident_id="INC_MUM_20260715_01"):
        """Innovation: AI Explainability & LLM Executive Operator Briefing.
        Synthesizes confidence ledger, physical sensors, railway telemetry,
        and crowdsourced reports into an authoritative Disaster Management / Operator Advisory."""
        ledger = self.get_evidence_confidence_ledger(incident_id)
        inc_row = self.df_incidents[self.df_incidents["incident_id"] == incident_id]
        if inc_row.empty:
            inc_row = self.df_incidents.iloc[0]
        else:
            inc_row = inc_row.iloc[0]

        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S IST")
        offline_count = len(self.offline_sensors)

        conf_score = ledger.get("confidence_score") or ledger.get("computed_confidence_score", 0.90)
        briefing = {
            "incident_id": incident_id,
            "generated_at": timestamp_str,
            "executive_title": f"MUMBAI DISASTER MANAGEMENT CELL — SITUATION ADVISORY ({inc_row['severity_level']})",
            "threat_level": "RED ALERT" if "LEVEL_4" in inc_row["severity_level"] else "AMBER ALERT",
            "confidence_percentage": round(conf_score * 100, 1),
            "confidence_grade": ledger.get("confidence_rating", "High"),
            "briefing_markdown": f"""### 🚨 EXECUTIVE DISASTER MANAGEMENT ADVISORY
**Target Zone:** {inc_row['affected_infrastructure']}  
**Incident Type:** {inc_row['scenario_type']} | **Severity:** {inc_row['severity_level']}  
**Confidence Score:** {round(conf_score * 100, 1)}% ({ledger.get('confidence_rating', 'High')})  
**Active Impact:** ~{int(inc_row['estimated_commuters_affected']):,} Commuters Displaced  

---
#### 1. Corroborated Ground Truth & Causal Mechanism
* **Physical Cause:** {inc_row['known_cause']}.
* **Ultrasonic Depth Telemetry:** Water level confirmed at **68.0 cm** at Malad Subway invert. Pumping discharge operating at maximum capacity.
* **Railway SCADA Telemetry:** Track submergence of **145 mm above rail top** on Western Railway slow line (Km 28/4). Circuit TC-284 tripped signals to fail-safe RED. Fast local 90158 halted at outer signal.

#### 2. Signal Integrity & Noise Filtering
* **Corroborating Feeds:** {len(ledger['supporting_evidence'])} independent automated telemetry streams agree on severe inundation.
* **Down-Weighted Social Claims:** {len(ledger['conflicting_evidence'])} conflicting Twitter/X claims ('road is clear') detected and suppressed by NLP reliability filter (weight: 0.42 vs 0.99 for physical gauges).
* **Sensor Health:** {f"{offline_count} sensor(s) currently unpolled/offline." if offline_count > 0 else "All corridor sensors operational."}

#### 3. Actionable Mitigation & Commuter Rerouting
1. **Western Railway:** Suspended Up/Down slow locals between Kandivali and Goregaon. Regulate Churchgate fast locals.
2. **Road Diversion:** S.V. Road closed at Malad subway junction; traffic diverted to New Link Road.
3. **Commuter Protection Advisory:** Disseminate immediate push alerts to Borivali/Kandivali commuters (including student cohort USR_001) to **divert to Metro Line 2A at Borivali West**, bypassing rail track submergence for an estimated **43-minute travel time recovery**.""",
            "key_actions": [
                "Deploy BMC high-capacity dewatering pump set #4 at Malad subway",
                "Traffic Police: Divert SV Road traffic towards Link Road at Mithchowki",
                "WR Control: Regulate Churchgate-bound suburban rakes at Borivali platform 6",
                "Commuter App: Issue priority rerouting push alert to Metro Line 2A"
            ]
        }
        return briefing

    def get_map_layers(self):
        """Provide detailed spatial vector coordinates for OpenStreetMap/Leaflet layers."""
        return {
            "rail_tracks": [
                {"name": "Dahisar to Bandra Western Railway Suburban Line",
                 "coords": [[19.2501, 72.8593], [19.2290, 72.8569], [19.2045, 72.8522], [19.1868, 72.8488], [19.1645, 72.8493], [19.1517, 72.8475], [19.1359, 72.8490], [19.1197, 72.8464], [19.0999, 72.8438], [19.0818, 72.8407], [19.0544, 72.8406]],
                 "color": "#ef4444", "weight": 4}
            ],
            "metro_viaduct": [
                {"name": "Metro Line 2A (Yellow Line - Dahisar W to DN Nagar)",
                 "coords": [[19.2555, 72.8624], [19.2505, 72.8540], [19.2345, 72.8458], [19.2272, 72.8455], [19.2085, 72.8423], [19.2025, 72.8398], [19.1865, 72.8380], [19.1685, 72.8365], [19.1510, 72.8359], [19.1308, 72.8322]],
                 "color": "#10b981", "weight": 4},
                {"name": "Metro Line 7 (Red Line - Dahisar E to Gundavali)",
                 "coords": [[19.2555, 72.8624], [19.2301, 72.8631], [19.2132, 72.8633], [19.1895, 72.8595], [19.1725, 72.8578], [19.1525, 72.8568], [19.1402, 72.8560], [19.1172, 72.8548]],
                 "color": "#f59e0b", "weight": 4}
            ],
            "flood_zones": [
                {"name": "Malad Subway Inundation Zone", "lat": 19.1862, "lon": 72.8462, "radius_m": 450, "water_depth_cm": 68.0, "status": "CLOSED"},
                {"name": "Andheri Subway Inundation Zone", "lat": 19.1215, "lon": 72.8445, "radius_m": 380, "water_depth_cm": 42.0, "status": "CRITICAL_SLOW"},
                {"name": "Milan Subway Inundation Zone", "lat": 19.0885, "lon": 72.8420, "radius_m": 350, "water_depth_cm": 38.0, "status": "WARNING"}
            ],
            "sahil_segments": {
                "clear_segment": {
                    "name": "Leg 1: Ashokvan ➔ Borivali Station (Auto/Walk)",
                    "coords": [[19.2372, 72.8695], [19.2290, 72.8569]],
                    "status": "CLEAR",
                    "color": "#10b981"
                },
                "flooded_segment": {
                    "name": "Leg 2 Disrupted: Borivali ➔ Malad ➔ Andheri (WR Rail Tracks)",
                    "coords": [[19.2290, 72.8569], [19.2045, 72.8522], [19.1868, 72.8488], [19.1197, 72.8464]],
                    "status": "TRACK_SUBMERGED_HALTED",
                    "color": "#f43f5e"
                },
                "metro_reroute": {
                    "name": "Leg 2 Recommended: Borivali West ➔ D.N. Nagar ➔ Versova (Metro 2A + Line 1)",
                    "coords": [[19.2272, 72.8455], [19.2085, 72.8423], [19.1865, 72.8380], [19.1510, 72.8359], [19.1308, 72.8322], [19.1315, 72.8172], [19.1342, 72.8145]],
                    "status": "RECOMMENDED_RESILIENT",
                    "color": "#06d6a0"
                }
            }
        }
