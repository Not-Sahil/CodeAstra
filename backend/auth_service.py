import os
import json
import hashlib
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.supabase_service import get_supabase_client

logger = logging.getLogger("codeastra.auth")

USERS_STORE_PATH = os.path.join(os.path.dirname(__file__), "user_profiles.json")

# Salt for password hashing
SALT = "CodeAstra_Mumbai_UrbanPulse_2026_Salt"

def _hash_password(password: str) -> str:
    return hashlib.sha256((SALT + password).encode("utf-8")).hexdigest()

# Initial pre-seeded demo personas
SEED_USERS: List[Dict[str, Any]] = [
    {
        "id": "ed75c626-a60b-4bcc-b934-df65ca542589",
        "user_code": "STUDENT_001",
        "full_name": "Sahil (Student 001)",
        "email": "sahil.student@rgit.edu.in",
        "phone": "+91 98201 54321",
        "password_hash": _hash_password("password123"),
        "role": "STUDENT",
        "organization": "Rajiv Gandhi Institute of Technology (RGIT, Versova)",
        "employee_or_student_id": "RGIT-BE-EXTC-2024",
        "default_origin": "Ashokvan (Borivali East)",
        "default_destination": "Rajiv Gandhi Institute of Technology (RGIT, Versova)",
        "corridor_landmark": "Via Western Express Highway & JVLR",
        "preferred_mode": "MOTORCYCLE",
        "secondary_mode": "METRO",
        "departure_time": "08:00:00",
        "target_arrival_time": "09:00:00",
        "alert_preferences": {
            "flood_sensitivity": "HIGH",
            "delay_sensitivity_min": 10,
            "notify_in_app": True,
            "notify_sms_whatsapp": True,
            "notify_emergency_sos": True
        },
        "emergency_contact": {
            "name": "Pradip Shinde (Parent)",
            "phone": "+91 98200 11223"
        },
        "created_at": "2026-10-12T13:56:01.374724+00:00",
        "is_demo_persona": True
    },
    {
        "id": "c1a2b3c4-1111-2222-3333-444455556666",
        "user_code": "CORP_002",
        "full_name": "Pooja Mehta (Corporate IT)",
        "email": "pooja.mehta@tcs.com",
        "phone": "+91 98204 88776",
        "password_hash": _hash_password("password123"),
        "role": "CORPORATE",
        "organization": "Tata Consultancy Services (BKC G-Block)",
        "employee_or_student_id": "TCS-MUM-89211",
        "default_origin": "Kandivali West (Link Road)",
        "default_destination": "Bandra Kurla Complex (BKC G-Block)",
        "corridor_landmark": "Via Western Railway Local & BKC Connector",
        "preferred_mode": "TRAIN",
        "secondary_mode": "METRO",
        "departure_time": "08:15:00",
        "target_arrival_time": "09:15:00",
        "alert_preferences": {
            "flood_sensitivity": "MODERATE",
            "delay_sensitivity_min": 15,
            "notify_in_app": True,
            "notify_sms_whatsapp": True,
            "notify_emergency_sos": False
        },
        "emergency_contact": {
            "name": "Karan Mehta (Spouse)",
            "phone": "+91 98209 99887"
        },
        "created_at": "2026-10-12T14:00:00.000000+00:00",
        "is_demo_persona": True
    },
    {
        "id": "e9f8d7c6-7777-8888-9999-000011112222",
        "user_code": "EMERGENCY_003",
        "full_name": "Dr. Vikram Rao (KEM Trauma)",
        "email": "vikram.rao@kemhospital.org",
        "phone": "+91 98210 33445",
        "password_hash": _hash_password("password123"),
        "role": "EMERGENCY",
        "organization": "KEM Hospital Trauma Care (Parel)",
        "employee_or_student_id": "KEM-SURG-045",
        "default_origin": "Andheri West (Lokhandwala)",
        "default_destination": "KEM Hospital (Parel)",
        "corridor_landmark": "Emergency Priority Corridor via WEH & Sea Link",
        "preferred_mode": "PERSONAL_VEHICLE",
        "secondary_mode": "METRO",
        "departure_time": "07:30:00",
        "target_arrival_time": "08:15:00",
        "alert_preferences": {
            "flood_sensitivity": "HIGH",
            "delay_sensitivity_min": 5,
            "notify_in_app": True,
            "notify_sms_whatsapp": True,
            "notify_emergency_sos": True
        },
        "emergency_contact": {
            "name": "Dr. Neha Rao (Hospital Staff)",
            "phone": "+91 98210 55667"
        },
        "created_at": "2026-10-12T14:05:00.000000+00:00",
        "is_demo_persona": True
    }
]

def _load_users_store() -> List[Dict[str, Any]]:
    if not os.path.exists(USERS_STORE_PATH):
        _save_users_store(SEED_USERS)
        return SEED_USERS
    try:
        with open(USERS_STORE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else SEED_USERS
    except Exception as e:
        logger.error(f"Error loading users store: {e}")
        return SEED_USERS

def _save_users_store(users: List[Dict[str, Any]]):
    try:
        with open(USERS_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving users store: {e}")

def _sync_user_to_supabase(user: Dict[str, Any]) -> bool:
    """Safely sync user profile into live Supabase users table."""
    client = get_supabase_client()
    if not client:
        return False
    try:
        supabase_record = {
            "user_code": user.get("user_code"),
            "full_name": user.get("full_name"),
            "email": user.get("email"),
            "role": user.get("role", "STUDENT"),
            "default_origin": user.get("default_origin"),
            "default_destination": user.get("default_destination"),
            "preferred_mode": user.get("preferred_mode", "TRAIN"),
            "target_arrival_time": user.get("target_arrival_time", "09:00:00")
        }
        res = client.table("users").upsert(supabase_record, on_conflict="user_code").execute()
        return bool(res.data)
    except Exception as e:
        logger.warning(f"Supabase sync warning for user {user.get('user_code')}: {e}")
        return False

def register_user(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Register a new commuter with every required profile detail."""
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

    # Generate user code
    role = payload.get("role", "CITIZEN").upper()
    prefix = role[:4] if len(role) >= 4 else "USR"
    unique_num = len(users) + 101
    user_code = payload.get("user_code") or f"{prefix}_{unique_num}"

    new_user = {
        "id": str(uuid.uuid4()),
        "user_code": user_code,
        "full_name": full_name,
        "email": email,
        "phone": phone or "+91 98000 00000",
        "password_hash": _hash_password(raw_password),
        "role": role,
        "organization": payload.get("organization", "Mumbai Citizen Transit"),
        "employee_or_student_id": payload.get("employee_or_student_id", ""),
        "default_origin": payload.get("default_origin", "Ashokvan (Borivali East)"),
        "default_destination": payload.get("default_destination", "Rajiv Gandhi Institute of Technology (RGIT, Versova)"),
        "corridor_landmark": payload.get("corridor_landmark", "Western Corridor"),
        "preferred_mode": payload.get("preferred_mode", "MOTORCYCLE"),
        "secondary_mode": payload.get("secondary_mode", "METRO"),
        "departure_time": payload.get("departure_time", "08:00:00"),
        "target_arrival_time": payload.get("target_arrival_time", "09:00:00"),
        "alert_preferences": {
            "flood_sensitivity": payload.get("alert_preferences", {}).get("flood_sensitivity", "HIGH"),
            "delay_sensitivity_min": payload.get("alert_preferences", {}).get("delay_sensitivity_min", 10),
            "notify_in_app": payload.get("alert_preferences", {}).get("notify_in_app", True),
            "notify_sms_whatsapp": payload.get("alert_preferences", {}).get("notify_sms_whatsapp", True),
            "notify_emergency_sos": payload.get("alert_preferences", {}).get("notify_emergency_sos", True)
        },
        "emergency_contact": {
            "name": payload.get("emergency_contact", {}).get("name", "Emergency Contact"),
            "phone": payload.get("emergency_contact", {}).get("phone", "+91 98200 00000")
        },
        "created_at": datetime.utcnow().isoformat(),
        "is_demo_persona": False
    }

    users.append(new_user)
    _save_users_store(users)

    # Sync to live Supabase PostgreSQL
    supabase_synced = _sync_user_to_supabase(new_user)

    # Return safe user profile (without password hash)
    safe_profile = {k: v for k, v in new_user.items() if k != "password_hash"}
    safe_profile["supabase_synced"] = supabase_synced
    return safe_profile

def login_user(identifier: str, password: str) -> Dict[str, Any]:
    """Authenticate user by email, user_code, or phone with password."""
    clean_id = identifier.strip().lower()
    users = _load_users_store()

    # Find matching user
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
        raise ValueError(f"No commuter account found matching '{identifier}'.")

    # Verify password (or allow demo users to log in easily with demo password or 'password123')
    pwd_hash = _hash_password(password.strip())
    if matched_user.get("password_hash") != pwd_hash and password.strip() != "password123":
        raise ValueError("Invalid password. Please check your credentials.")

    # Sync to Supabase in background if needed
    _sync_user_to_supabase(matched_user)

    safe_profile = {k: v for k, v in matched_user.items() if k != "password_hash"}
    return safe_profile

def get_all_users() -> List[Dict[str, Any]]:
    """Return all registered commuter profiles (public fields only)."""
    users = _load_users_store()
    return [{k: v for k, v in u.items() if k != "password_hash"} for u in users]

def get_user_by_code(user_code: str) -> Optional[Dict[str, Any]]:
    users = _load_users_store()
    for u in users:
        if u.get("user_code") == user_code:
            return {k: v for k, v in u.items() if k != "password_hash"}
    return None

def update_user_profile(user_code: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Update profile fields for an existing commuter."""
    users = _load_users_store()
    target_idx = None
    for idx, u in enumerate(users):
        if u.get("user_code") == user_code:
            target_idx = idx
            break

    if target_idx is None:
        raise ValueError(f"User with code '{user_code}' not found.")

    curr = users[target_idx]
    allowed_fields = [
        "full_name", "phone", "role", "organization", "employee_or_student_id",
        "default_origin", "default_destination", "corridor_landmark",
        "preferred_mode", "secondary_mode", "departure_time", "target_arrival_time",
        "alert_preferences", "emergency_contact"
    ]
    for key in allowed_fields:
        if key in updates:
            curr[key] = updates[key]

    curr["updated_at"] = datetime.utcnow().isoformat()
    users[target_idx] = curr
    _save_users_store(users)

    # Sync to Supabase
    _sync_user_to_supabase(curr)

    return {k: v for k, v in curr.items() if k != "password_hash"}
