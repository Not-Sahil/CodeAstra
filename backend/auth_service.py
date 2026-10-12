"""
User Profile and Authentication Service (Phase 11)
Supabase Auth-integrated user profiles. Eliminates dummy/seeded commuter personas.
Only manages real registered users, their saved default commutes, and SMS notification preferences.
"""

import os
import json
import hashlib
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.supabase_service import get_supabase_client

logger = logging.getLogger("UrbanPulse.Auth")

USERS_STORE_PATH = os.path.join(os.path.dirname(__file__), "user_profiles.json")
SALT = "CodeAstra_Mumbai_UrbanPulse_2026_Salt"

def _hash_password(password: str) -> str:
    return hashlib.sha256((SALT + password).encode("utf-8")).hexdigest()

def _load_users_store() -> List[Dict[str, Any]]:
    """Loads registered users from local cache or Supabase."""
    # First attempt to load real users from Supabase PostgreSQL
    client = get_supabase_client()
    if client:
        try:
            res = client.table("users").select("*").execute()
            if res.data:
                # Filter out any lingering demo accounts
                real_users = [u for u in res.data if not u.get("is_demo_persona", False)]
                if real_users:
                    return real_users
        except Exception as e:
            logger.debug(f"Supabase users table query returned: {e}")

    # Fallback to local store
    if not os.path.exists(USERS_STORE_PATH):
        return []
    try:
        with open(USERS_STORE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                # Filter out demo personas
                return [u for u in data if not u.get("is_demo_persona", False)]
            return []
    except Exception as e:
        logger.error(f"Error loading users store: {e}")
        return []

def _save_users_store(users: List[Dict[str, Any]]):
    try:
        clean_users = [u for u in users if not u.get("is_demo_persona", False)]
        with open(USERS_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(clean_users, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving users store: {e}")

def _sync_user_to_supabase(user: Dict[str, Any]) -> bool:
    """Safely sync user profile into live Supabase users table."""
    client = get_supabase_client()
    if not client:
        return False
    try:
        user_code = user.get("user_code") or f"COMMUTER_{uuid.uuid4().hex[:6].upper()}"
        user_id = user.get("id")

        # Check if user already exists by email in Supabase
        existing = client.table("users").select("user_code, id").eq("email", user.get("email")).execute()
        if existing.data and len(existing.data) > 0:
            user_code = existing.data[0].get("user_code") or user_code
            user_id = existing.data[0].get("id") or user_id

        supabase_record = {
            "id": user_id,
            "user_code": user_code,
            "full_name": user.get("full_name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "default_origin": user.get("default_origin", ""),
            "default_destination": user.get("default_destination", ""),
            "preferred_mode": user.get("preferred_mode", "DRIVE"),
            "scheduled_sms_time": user.get("scheduled_sms_time", "08:00"),
            "sms_consent": user.get("sms_consent", False),
            "sms_notifications_enabled": user.get("sms_notifications_enabled", False),
            "created_at": user.get("created_at") or datetime.utcnow().isoformat()
        }
        res = client.table("users").upsert(supabase_record, on_conflict="user_code").execute()
        return bool(res.data)
    except Exception as e:
        logger.warning(f"Supabase sync warning for user {user.get('email')}: {e}")
        return False

def register_user(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Register a new commuter with genuine profile details."""
    full_name = payload.get("full_name", "").strip()
    email = payload.get("email", "").strip().lower()
    phone = payload.get("phone", "").strip()
    raw_password = payload.get("password", "").strip()

    if not full_name:
        raise ValueError("Full Name is required.")
    if not email:
        raise ValueError("Email address is required.")
    if not raw_password or len(raw_password) < 6:
        raise ValueError("Password must be at least 6 characters.")
    
    users = _load_users_store()

    # Check for duplicate email
    for u in users:
        if u.get("email", "").lower() == email:
            raise ValueError(f"An account with email '{email}' already exists. Please sign in.")

    user_id = str(uuid.uuid4())
    user_code = f"COMMUTER_{len(users) + 101}"

    new_user = {
        "id": user_id,
        "user_code": user_code,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "password_hash": _hash_password(raw_password),
        "default_origin": payload.get("default_origin", ""),
        "default_destination": payload.get("default_destination", ""),
        "preferred_mode": payload.get("preferred_mode", "DRIVE"),
        "scheduled_sms_time": payload.get("scheduled_sms_time", "08:00"),
        "sms_consent": payload.get("sms_consent", False),
        "sms_notifications_enabled": payload.get("sms_notifications_enabled", False),
        "alert_preferences": {
            "notify_sms": payload.get("sms_consent", False),
            "notify_in_app": True
        },
        "created_at": datetime.utcnow().isoformat(),
        "is_demo_persona": False
    }

    users.append(new_user)
    _save_users_store(users)

    # Sync to live Supabase PostgreSQL
    supabase_synced = _sync_user_to_supabase(new_user)

    safe_profile = {k: v for k, v in new_user.items() if k != "password_hash"}
    safe_profile["supabase_synced"] = supabase_synced
    return safe_profile

def login_user(identifier: str, password: str) -> Dict[str, Any]:
    """Authenticate user by email or phone with password."""
    clean_id = identifier.strip().lower()
    users = _load_users_store()

    matched_user = None
    for u in users:
        if (
            u.get("email", "").lower() == clean_id or 
            u.get("user_code", "").lower() == clean_id or
            u.get("phone", "").replace(" ", "").replace("-", "") == clean_id.replace(" ", "").replace("-", "")
        ):
            matched_user = u
            break

    if not matched_user:
        raise ValueError(f"No commuter account found matching '{identifier}'. Please register first.")

    pwd_hash = _hash_password(password.strip())
    if matched_user.get("password_hash") != pwd_hash:
        raise ValueError("Invalid password. Please check your credentials.")

    safe_profile = {k: v for k, v in matched_user.items() if k != "password_hash"}
    return safe_profile

def get_all_users() -> List[Dict[str, Any]]:
    """Returns only real registered commuters (never demo personas)."""
    users = _load_users_store()
    return [{k: v for k, v in u.items() if k != "password_hash"} for u in users if not u.get("is_demo_persona", False)]

def get_user_by_code(user_code: str) -> Optional[Dict[str, Any]]:
    users = _load_users_store()
    for u in users:
        if u.get("user_code") == user_code or u.get("id") == user_code or u.get("email") == user_code:
            return {k: v for k, v in u.items() if k != "password_hash"}
    return None

def update_user_profile(user_code: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update commuter default commute, SMS preferences, and sync to Supabase."""
    users = _load_users_store()
    matched = None
    for u in users:
        if u.get("user_code") == user_code or u.get("id") == user_code or u.get("email") == user_code:
            matched = u
            break
            
    if not matched:
        raise ValueError("User not found.")

    allowed_fields = [
        "full_name", "phone", "default_origin", "default_destination",
        "preferred_mode", "scheduled_sms_time", "sms_consent",
        "sms_notifications_enabled", "alert_preferences"
    ]
    for key in allowed_fields:
        if key in updates:
            matched[key] = updates[key]

    matched["updated_at"] = datetime.utcnow().isoformat()
    _save_users_store(users)
    _sync_user_to_supabase(matched)

    return {k: v for k, v in matched.items() if k != "password_hash"}
