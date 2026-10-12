import os
import json
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("codeastra.supabase")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_client = None
_local_commute_queries = []
_local_replay_logs = []

def get_supabase_client():
    global _client
    if _client is not None:
        return _client

    if not SUPABASE_URL or not SUPABASE_KEY or "your-project-id" in SUPABASE_URL:
        return None

    try:
        from supabase import create_client
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info(f"Connected to Supabase at {SUPABASE_URL}")
        return _client
    except Exception as e:
        logger.warning(f"Could not connect to Supabase: {e}")
        return None

def get_supabase_status():
    """Return status of Supabase database connection."""
    client = get_supabase_client()
    if client:
        try:
            # Quick ping query
            client.table("users").select("id").limit(1).execute()
            return {
                "connected": True,
                "mode": "SUPABASE_CLOUD_LIVE",
                "url": SUPABASE_URL[:18] + "...",
                "message": "Connected to Supabase live PostgreSQL cluster.",
                "local_cached_queries": len(_local_commute_queries)
            }
        except Exception as err:
            return {
                "connected": False,
                "mode": "CREDENTIALS_CONFIGURED_BUT_UNREACHABLE",
                "url": SUPABASE_URL[:18] + "...",
                "message": f"Supabase auth/network error: {str(err)[:80]}. Using local cache.",
                "local_cached_queries": len(_local_commute_queries)
            }
    
    return {
        "connected": False,
        "mode": "LOCAL_CACHE_MODE",
        "url": None,
        "message": "Supabase credentials not configured in .env. Operating seamlessly in fast local memory mode.",
        "local_cached_queries": len(_local_commute_queries)
    }

def save_commute_query_record(query_data: dict):
    """Save user commute search into Supabase or local cache."""
    record = {
        "user_name": query_data.get("user_name", "Commuter"),
        "origin": query_data.get("origin", ""),
        "destination": query_data.get("destination", ""),
        "preferred_mode": query_data.get("preferred_mode", "TRAIN"),
        "calculated_travel_time_min": query_data.get("calculated_travel_time_min", 0),
        "recommended_mode": query_data.get("recommended_mode", ""),
        "net_time_saved_min": query_data.get("net_time_saved_min", 0),
        "incident_exposure_score": query_data.get("incident_exposure_score", "MODERATE"),
        "nearby_hazards_count": query_data.get("nearby_hazards_count", 0),
        "intersecting_incidents": query_data.get("intersecting_incidents", []),
        "itinerary_details": query_data.get("itinerary_details", {}),
        "corridor_threshold_m": query_data.get("corridor_threshold_m", 350.0),
        "route_geometry": query_data.get("route_geometry", {}),
        "alternative_routes": query_data.get("alternative_routes", []),
        "is_authoritative_google_route": query_data.get("is_authoritative_google_route", True),
        "routing_provider": query_data.get("routing_provider", "GOOGLE_ROUTES_API_V2"),
        "searched_at": datetime.utcnow().isoformat()
    }

    _local_commute_queries.insert(0, record)
    if len(_local_commute_queries) > 100:
        _local_commute_queries.pop()

    client = get_supabase_client()
    if client:
        try:
            client.table("commute_queries").insert(record).execute()
            return {"status": "SAVED_TO_SUPABASE", "record": record}
        except Exception as e:
            logger.warning(f"Failed to write commute query to Supabase: {e}")
            return {"status": "CACHED_LOCALLY", "error": str(e), "record": record}

    return {"status": "SAVED_LOCALLY", "record": record}

def record_replay_action_log(action_type: str, payload: dict, ledger: dict):
    """Save replay lab resilience action into Supabase or local cache."""
    record = {
        "action_type": action_type,
        "payload": payload,
        "resulting_confidence": ledger.get("confidence_score", 0.0),
        "supporting_evidence_count": ledger.get("counts", {}).get("supporting", 0),
        "contradictory_evidence_count": ledger.get("counts", {}).get("contradictory", 0),
        "duplicate_reports_excluded": ledger.get("counts", {}).get("duplicates_excluded", 0),
        "stale_sensors_count": ledger.get("counts", {}).get("missing_or_stale", 0),
        "applied_at": datetime.utcnow().isoformat()
    }

    _local_replay_logs.insert(0, record)
    if len(_local_replay_logs) > 50:
        _local_replay_logs.pop()

    client = get_supabase_client()
    if client:
        try:
            client.table("replay_logs").insert(record).execute()
            return {"status": "SAVED_TO_SUPABASE"}
        except Exception as e:
            logger.warning(f"Failed to record replay log to Supabase: {e}")
            return {"status": "CACHED_LOCALLY", "error": str(e)}

    return {"status": "SAVED_LOCALLY"}

def sync_active_incidents(incidents_list: list):
    """Sync all active incidents to Supabase database with coordinates, status, and verification."""
    client = get_supabase_client()
    if not client:
        return {"synced": False, "count": len(incidents_list), "mode": "LOCAL_CACHE"}

    try:
        records = []
        for inc in incidents_list:
            lat = inc.get("centroid_lat") or inc.get("latitude")
            lon = inc.get("centroid_lon") or inc.get("longitude")
            is_valid_coord = (lat is not None and lon is not None and -90.0 <= float(lat) <= 90.0 and -180.0 <= float(lon) <= 180.0)
            
            records.append({
                "incident_id": inc["incident_id"],
                "scenario_type": inc["scenario_type"],
                "incident_title": inc["title"],
                "start_time": inc.get("start_time", datetime.utcnow().isoformat()),
                "end_time": inc.get("end_time"),
                "centroid_lat": float(lat) if is_valid_coord else 0.0,
                "centroid_lon": float(lon) if is_valid_coord else 0.0,
                "affected_radius_km": inc.get("radius_km", 1.2),
                "affected_infrastructure": inc.get("affected_infrastructure", "Corridor"),
                "severity_level": inc["severity_level"],
                "estimated_commuters_affected": inc.get("commuters_affected", 0),
                "confidence_score": inc.get("confidence_score", 0.90),
                "known_cause": inc.get("known_cause", "Unverified"),
                "status": inc.get("status", "ACTIVE"),
                "is_simulated": inc.get("is_simulated", True),
                "location_verified": is_valid_coord and inc.get("location_verified", True),
                "source": inc.get("source", "MUMBAI_DISASTER_MANAGEMENT_CAD_112"),
                "source_reliability": inc.get("source_reliability", 0.94),
                "last_updated": inc.get("last_updated", datetime.utcnow().isoformat())
            })

        # Upsert records
        client.table("incidents").upsert(records).execute()
        return {"synced": True, "count": len(records), "mode": "SUPABASE_CLOUD"}
    except Exception as e:
        logger.error(f"Error syncing incidents to Supabase: {e}")
        return {"synced": False, "error": str(e), "count": len(incidents_list)}

def get_recent_commute_queries():
    client = get_supabase_client()
    if client:
        try:
            res = client.table("commute_queries").select("*").order("searched_at", desc=True).limit(10).execute()
            if res.data:
                return res.data
        except Exception as e:
            logger.warning(f"Could not read from Supabase: {e}")

    return _local_commute_queries[:10]
