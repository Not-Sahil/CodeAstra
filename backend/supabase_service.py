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

NOTIFICATIONS_STORE_PATH = os.path.join(os.path.dirname(__file__), "user_notifications.json")

def _load_local_notifications():
    if os.path.exists(NOTIFICATIONS_STORE_PATH):
        try:
            with open(NOTIFICATIONS_STORE_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def _save_local_notifications(items):
    try:
        with open(NOTIFICATIONS_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(items[:500], f, indent=2)
    except Exception as e:
        logger.error(f"Error saving local notifications: {e}")

_local_notifications = _load_local_notifications()

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
            # If extended columns (e.g. alternative_routes) are not yet in remote schema, fallback to base fields
            try:
                base_record = {
                    "user_name": record["user_name"],
                    "origin": record["origin"],
                    "destination": record["destination"],
                    "preferred_mode": record["preferred_mode"],
                    "calculated_travel_time_min": record["calculated_travel_time_min"],
                    "recommended_mode": record["recommended_mode"],
                    "net_time_saved_min": record["net_time_saved_min"],
                    "incident_exposure_score": record["incident_exposure_score"],
                    "nearby_hazards_count": record["nearby_hazards_count"],
                    "intersecting_incidents": record["intersecting_incidents"],
                    "itinerary_details": record["itinerary_details"]
                }
                client.table("commute_queries").insert(base_record).execute()
                return {"status": "SAVED_TO_SUPABASE_BASE_SCHEMA", "record": base_record}
            except Exception as e_base:
                logger.warning(f"Failed to write commute query to Supabase: {e_base}")
                return {"status": "CACHED_LOCALLY", "error": str(e_base), "record": record}

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

def save_user_notification(record: dict) -> dict:
    """
    Saves a personalized user notification into Supabase public.user_notifications
    and the persistent local store.
    """
    import uuid
    notif_id = record.get("id") or str(uuid.uuid4())
    record["id"] = notif_id
    if "created_at" not in record:
        record["created_at"] = datetime.utcnow().isoformat()
    if "is_read" not in record:
        record["is_read"] = False

    # Check local duplicate by idempotency_key if provided
    idempotency_key = record.get("idempotency_key")
    if idempotency_key:
        for existing in _local_notifications:
            if existing.get("idempotency_key") == idempotency_key:
                return {"status": "DUPLICATE_IDEMPOTENCY_SUPPRESSED", "record": existing}

    _local_notifications.insert(0, record)
    _save_local_notifications(_local_notifications)

    client = get_supabase_client()
    if client:
        try:
            db_record = {
                "id": record["id"],
                "user_id": record.get("user_id"),
                "user_code": record.get("user_code"),
                "incident_id": record.get("incident_id"),
                "alert_type": record.get("alert_type", "NEARBY"),
                "title": record.get("title", ""),
                "message": record.get("message", ""),
                "severity": record.get("severity", "MODERATE"),
                "channels": record.get("channels", ["IN_APP"]),
                "delivery_status": record.get("delivery_status", "DELIVERED"),
                "is_read": record.get("is_read", False),
                "evidence_summary": record.get("evidence_summary", {}),
                "missing_data_qualification": record.get("missing_data_qualification"),
                "idempotency_key": idempotency_key,
                "created_at": record["created_at"]
            }
            client.table("user_notifications").insert(db_record).execute()
            return {"status": "SAVED_TO_SUPABASE", "record": record}
        except Exception as e:
            logger.warning(f"Could not persist notification to Supabase user_notifications: {e}")
            return {"status": "CACHED_LOCALLY", "record": record, "db_error": str(e)}

    return {"status": "SAVED_LOCALLY", "record": record}

def get_user_notifications(user_identifier: str, limit: int = 50) -> list:
    """
    Fetches notifications for a specific user by user_id, user_code, or email.
    Enforces user isolation so only the user's notifications are returned.
    """
    clean_id = (user_identifier or "").strip().lower()
    if not clean_id:
        return []

    client = get_supabase_client()
    if client:
        try:
            # Query by user_code or user_id
            res = client.table("user_notifications").select("*").or_(
                f"user_code.eq.{user_identifier},user_id.eq.{user_identifier}"
            ).order("created_at", desc=True).limit(limit).execute()
            if res.data:
                return res.data
        except Exception as e:
            logger.debug(f"Supabase notifications query fallback: {e}")

    # Fallback / local store matching
    matched = []
    for n in _local_notifications:
        u_code = str(n.get("user_code") or "").lower()
        u_id = str(n.get("user_id") or "").lower()
        u_email = str(n.get("email") or "").lower()
        if clean_id in [u_code, u_id, u_email]:
            matched.append(n)
        if len(matched) >= limit:
            break

    return matched

def mark_notification_as_read(notification_id: str, user_identifier: str = None) -> bool:
    """Mark a single notification as read."""
    found = False
    for n in _local_notifications:
        if n.get("id") == notification_id:
            # Enforce user isolation if user_identifier provided
            if user_identifier:
                u_code = str(n.get("user_code") or "").lower()
                u_id = str(n.get("user_id") or "").lower()
                clean_id = user_identifier.lower()
                if clean_id not in [u_code, u_id]:
                    return False
            n["is_read"] = True
            found = True
            break
    if found:
        _save_local_notifications(_local_notifications)

    client = get_supabase_client()
    if client:
        try:
            client.table("user_notifications").update({"is_read": True}).eq("id", notification_id).execute()
            return True
        except Exception as e:
            logger.warning(f"Could not update notification in Supabase: {e}")

    return found

def mark_all_notifications_as_read(user_identifier: str) -> int:
    """Mark all notifications as read for a given user."""
    clean_id = (user_identifier or "").strip().lower()
    updated_count = 0
    for n in _local_notifications:
        u_code = str(n.get("user_code") or "").lower()
        u_id = str(n.get("user_id") or "").lower()
        if clean_id in [u_code, u_id]:
            if not n.get("is_read"):
                n["is_read"] = True
                updated_count += 1
    if updated_count > 0:
        _save_local_notifications(_local_notifications)

    client = get_supabase_client()
    if client:
        try:
            client.table("user_notifications").update({"is_read": True}).or_(
                f"user_code.eq.{user_identifier},user_id.eq.{user_identifier}"
            ).execute()
        except Exception as e:
            logger.warning(f"Could not batch update notifications in Supabase: {e}")

    return updated_count

def get_unread_notifications_count(user_identifier: str) -> int:
    """Returns number of unread notifications for a user."""
    notifs = get_user_notifications(user_identifier)
    return sum(1 for n in notifs if not n.get("is_read", False))


# -----------------------------------------------------------------------------
# 9. MUNICIPAL WORK ORDERS & AUDIT TRAIL PERSISTENCE
# -----------------------------------------------------------------------------
WORK_ORDERS_STORE_PATH = os.path.join(os.path.dirname(__file__), "work_orders.json")
AUDIT_LOGS_STORE_PATH = os.path.join(os.path.dirname(__file__), "work_order_audit.json")
BRIEFINGS_STORE_PATH = os.path.join(os.path.dirname(__file__), "operator_briefings.json")

def _load_json_store(filepath):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def _save_json_store(filepath, items):
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(items[:500], f, indent=2)
    except Exception as e:
        logger.error(f"Error saving {filepath}: {e}")

_local_work_orders = _load_json_store(WORK_ORDERS_STORE_PATH)
_local_audit_logs = _load_json_store(AUDIT_LOGS_STORE_PATH)
_local_briefings = _load_json_store(BRIEFINGS_STORE_PATH)

def save_municipal_work_order(order_data: dict) -> dict:
    """Save newly created draft municipal work order."""
    now_iso = datetime.now().isoformat()
    order = {
        "work_order_id": order_data.get("work_order_id"),
        "incident_id": order_data.get("incident_id"),
        "incident_type": order_data.get("incident_type", "Urban Incident"),
        "location_name": order_data.get("location_name", "Mumbai"),
        "latitude": float(order_data.get("latitude", 19.1875)),
        "longitude": float(order_data.get("longitude", 72.8504)),
        "problem_description": order_data.get("problem_description", ""),
        "observed_symptoms": order_data.get("observed_symptoms", []),
        "root_cause_hypothesis": order_data.get("root_cause_hypothesis", "Root cause undetermined"),
        "supporting_evidence": order_data.get("supporting_evidence", []),
        "confidence_score": float(order_data.get("confidence_score", 0.85)),
        "recommended_response": order_data.get("recommended_response", ""),
        "suggested_resources": order_data.get("suggested_resources", []),
        "priority": order_data.get("priority", "HIGH"),
        "department": order_data.get("department", "MCGM Storm Water Drains Dept"),
        "verification_steps": order_data.get("verification_steps", []),
        "safety_considerations": order_data.get("safety_considerations", []),
        "status": order_data.get("status", "DRAFT"),
        "operator_notes": order_data.get("operator_notes", ""),
        "created_by": order_data.get("created_by", "OPERATOR_DESK"),
        "approved_by": order_data.get("approved_by"),
        "approved_at": order_data.get("approved_at"),
        "is_simulated": bool(order_data.get("is_simulated", False)),
        "external_transmission_status": order_data.get("external_transmission_status", "NOT_TRANSMITTED"),
        "created_at": order_data.get("created_at", now_iso),
        "updated_at": now_iso
    }

    # Upsert in local cache
    existing_idx = next((i for i, o in enumerate(_local_work_orders) if o.get("work_order_id") == order["work_order_id"]), None)
    if existing_idx is not None:
        _local_work_orders[existing_idx] = order
    else:
        _local_work_orders.insert(0, order)
    _save_json_store(WORK_ORDERS_STORE_PATH, _local_work_orders)

    # Log initial draft creation audit
    save_work_order_audit_log(
        work_order_id=order["work_order_id"],
        action="DRAFT_CREATED",
        actor=order["created_by"],
        actor_role="OPERATOR",
        prev_status=None,
        new_status="DRAFT",
        details={"incident_id": order["incident_id"], "priority": order["priority"]}
    )

    client = get_supabase_client()
    if client:
        try:
            client.table("municipal_work_orders").upsert(order).execute()
        except Exception as e:
            logger.warning(f"Could not persist work order to Supabase: {e}")

    return order

def update_municipal_work_order(work_order_id: str, updates: dict, actor: str = "OPERATOR", role: str = "OPERATOR") -> dict:
    """Update status, fields, or approvals of a municipal work order."""
    existing = next((o for o in _local_work_orders if o.get("work_order_id") == work_order_id), None)
    if not existing:
        return None

    prev_status = existing.get("status")
    new_status = updates.get("status", prev_status)

    # Authorization verification: CITIZEN cannot approve or reject work orders
    if new_status in ["APPROVED", "REJECTED", "TRANSMITTED"] and role.upper() not in ["OPERATOR", "ADMIN", "MUNICIPAL_OFFICER"]:
        # Log unauthorized attempt in audit trail
        save_work_order_audit_log(
            work_order_id=work_order_id,
            action="UNAUTHORIZED_ACTION_BLOCKED",
            actor=actor,
            actor_role=role,
            prev_status=prev_status,
            new_status=prev_status,
            details={"attempted_status": new_status, "reason": "Insufficient permissions"}
        )
        raise PermissionError(f"Role '{role}' is not authorized to approve or modify municipal work orders.")

    for k, v in updates.items():
        existing[k] = v
    existing["updated_at"] = datetime.now().isoformat()

    if new_status == "APPROVED" and prev_status != "APPROVED":
        existing["approved_by"] = actor
        existing["approved_at"] = datetime.now().isoformat()

    _save_json_store(WORK_ORDERS_STORE_PATH, _local_work_orders)

    action_label = "APPROVED" if new_status == "APPROVED" else ("REJECTED" if new_status == "REJECTED" else "EDITED")
    save_work_order_audit_log(
        work_order_id=work_order_id,
        action=action_label,
        actor=actor,
        actor_role=role,
        prev_status=prev_status,
        new_status=new_status,
        details={"updates": list(updates.keys())}
    )

    client = get_supabase_client()
    if client:
        try:
            client.table("municipal_work_orders").update(existing).eq("work_order_id", work_order_id).execute()
        except Exception as e:
            logger.warning(f"Could not update work order in Supabase: {e}")

    return existing

def get_municipal_work_orders(incident_id: str = None) -> list:
    """Return all stored municipal work orders, optionally filtered by incident."""
    if incident_id:
        return [o for o in _local_work_orders if o.get("incident_id") == incident_id]
    return list(_local_work_orders)

def get_municipal_work_order_by_id(work_order_id: str) -> dict:
    """Find specific work order by identifier."""
    return next((o for o in _local_work_orders if o.get("work_order_id") == work_order_id), None)

def save_work_order_audit_log(work_order_id: str, action: str, actor: str, actor_role: str,
                              prev_status: str = None, new_status: str = None, details: dict = None) -> dict:
    """Append audit record for work order lifecycle event."""
    log_entry = {
        "work_order_id": work_order_id,
        "action": action,
        "actor": actor,
        "actor_role": actor_role,
        "previous_status": prev_status,
        "new_status": new_status,
        "details": details or {},
        "timestamp": datetime.now().isoformat()
    }
    _local_audit_logs.insert(0, log_entry)
    _save_json_store(AUDIT_LOGS_STORE_PATH, _local_audit_logs)

    client = get_supabase_client()
    if client:
        try:
            client.table("work_order_audit_logs").insert(log_entry).execute()
        except Exception as e:
            logger.warning(f"Could not persist audit log to Supabase: {e}")

    return log_entry

def get_work_order_audit_logs(work_order_id: str) -> list:
    """Return chronological audit trail for a work order."""
    return [log for log in _local_audit_logs if log.get("work_order_id") == work_order_id]

def save_operator_briefing(briefing_data: dict) -> dict:
    """Store generated explainable operator briefing."""
    data = dict(briefing_data)
    data["created_at"] = data.get("created_at") or datetime.now().isoformat()
    _local_briefings.insert(0, data)
    _save_json_store(BRIEFINGS_STORE_PATH, _local_briefings)

    client = get_supabase_client()
    if client:
        try:
            client.table("operator_briefings").insert(data).execute()
        except Exception as e:
            logger.warning(f"Could not persist briefing to Supabase: {e}")

    return data

def get_operator_briefings(incident_id: str = None) -> list:
    """Get stored operator briefings."""
    if incident_id:
        return [b for b in _local_briefings if b.get("incident_id") == incident_id]
    return list(_local_briefings)

