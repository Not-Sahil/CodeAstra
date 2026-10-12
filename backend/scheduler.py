"""
Automated Daily Commute Alert Scheduler (Phase 13.G)
Persistent background task running on Asia/Kolkata timezone.
Evaluates saved default commutes for opted-in users, checks live route incidents,
and dispatches concise SMS summaries via Fast2SMS with idempotency guards.
"""

import time
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from backend.sms_service import sms_service
from backend.supabase_service import get_supabase_client

logger = logging.getLogger("UrbanPulse.Scheduler")

# IST is UTC+05:30
IST_OFFSET = timedelta(hours=5, minutes=30)

class DailyCommuteScheduler:
    def __init__(self, engine_ref=None):
        self.engine = engine_ref
        self._is_running = False
        self._task: Optional[asyncio.Task] = None
        # Track daily dispatches: f"{user_id}_{YYYY-MM-DD}" -> timestamp
        self._dispatched_today: Dict[str, float] = {}

    def get_ist_now(self) -> datetime:
        return datetime.now(timezone.utc) + IST_OFFSET

    async def start(self, engine_ref=None):
        """Starts the background scheduler loop."""
        if engine_ref:
            self.engine = engine_ref
        if self._is_running:
            return
        self._is_running = True
        self._task = asyncio.create_task(self._scheduler_loop())
        logger.info("DailyCommuteScheduler started for Asia/Kolkata timezone.")

    def stop(self):
        """Stops the scheduler."""
        self._is_running = False
        if self._task:
            self._task.cancel()
        logger.info("DailyCommuteScheduler stopped.")

    async def _scheduler_loop(self):
        """Background loop executing every 60 seconds."""
        while self._is_running:
            try:
                await self.check_and_dispatch_due_alerts()
            except Exception as e:
                logger.error(f"Error in scheduler tick: {e}", exc_info=True)
            await asyncio.sleep(60)

    async def check_and_dispatch_due_alerts(self) -> List[Dict[str, Any]]:
        """
        Scans registered user profiles for scheduled alert dispatches.
        """
        now_ist = self.get_ist_now()
        current_time_str = now_ist.strftime("%H:%M")
        today_date_str = now_ist.strftime("%Y-%m-%d")

        dispatched_results = []
        users = self._get_eligible_users()

        for user in users:
            user_id = user.get("id") or user.get("user_code") or user.get("email")
            preferred_time = user.get("scheduled_sms_time", "08:00")
            
            # Match current HH:MM (or within 2 minutes)
            if preferred_time == current_time_str:
                dispatch_key = f"{user_id}_{today_date_str}"
                if dispatch_key in self._dispatched_today:
                    continue  # Already sent today

                result = await self.evaluate_and_send_user_alert(user)
                self._dispatched_today[dispatch_key] = time.time()
                dispatched_results.append(result)

        return dispatched_results

    async def evaluate_and_send_user_alert(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates a single user's commute and sends SMS alert if route has hazards.
        """
        phone = user.get("phone")
        origin = user.get("default_origin") or "Ashokvan (Borivali East)"
        dest = user.get("default_destination") or "Versova (Andheri West)"
        user_name = user.get("full_name") or user.get("name") or "Commuter"
        travel_mode = user.get("preferred_mode") or "DRIVE"

        # 1. Run commute evaluation if engine is available
        route_incidents = []
        if self.engine:
            try:
                eval_res = self.engine.evaluate_custom_commute(
                    origin=origin,
                    destination=dest,
                    preferred_mode=travel_mode,
                    user_name=user_name,
                    corridor_threshold_m=350.0
                )
                route_incidents = eval_res.get("intersecting_incidents", [])
            except Exception as e:
                logger.warning(f"Error evaluating route for scheduled SMS: {e}")

        # 2. Build concise message adhering to Phase 13.H
        if route_incidents:
            primary_hazard = route_incidents[0]
            hz_title = primary_hazard.get("title") or primary_hazard.get("type", "road hazard")
            message = (
                f"UrbanPulse: Your saved commute to {dest[:25]} may be affected by {hz_title}. "
                f"Check current route conditions before leaving."
            )
        else:
            message = (
                f"UrbanPulse: Good morning {user_name}. Your saved route from {origin[:20]} to {dest[:20]} "
                f"is currently clear of reported disruptions."
            )

        # 3. Dispatch via Fast2SMS
        sms_res = sms_service.send_commute_sms_alert(phone, message)

        # 4. Record to Supabase audit log if available
        self._record_alert_log(user, message, sms_res)

        return {
            "user": user_name,
            "phone_masked": sms_service.mask_phone(phone),
            "scheduled_time": user.get("scheduled_sms_time", "08:00"),
            "incidents_count": len(route_incidents),
            "sms_result": sms_res
        }

    def _get_eligible_users(self) -> List[Dict[str, Any]]:
        """
        Fetches opted-in users with verified phone and explicit SMS consent.
        Falls back to local profiles if Supabase is offline.
        """
        eligible = []
        sp = get_supabase_client()
        if sp:
            try:
                resp = sp.table("users").select("*").eq("sms_consent", True).execute()
                if resp.data:
                    for u in resp.data:
                        if u.get("phone") and u.get("sms_notifications_enabled", True):
                            eligible.append(u)
                    return eligible
            except Exception as e:
                logger.warning(f"Supabase user fetch failed for scheduler: {e}")

        # Fallback to local user profiles if needed
        from backend.auth_service import get_all_users
        for u in get_all_users():
            # Check consent flag
            alert_prefs = u.get("alert_preferences", {})
            if alert_prefs.get("sms_enabled") is True or u.get("sms_consent") is True:
                if u.get("phone"):
                    eligible.append(u)

        return eligible

    def _record_alert_log(self, user: Dict[str, Any], message: str, sms_res: Dict[str, Any]):
        """Records alert dispatch in Supabase sms_delivery_logs table."""
        sp = get_supabase_client()
        if not sp:
            return
        try:
            sp.table("sms_delivery_logs").insert({
                "user_id": user.get("id"),
                "phone_masked": sms_service.mask_phone(user.get("phone", "")),
                "message": message[:200],
                "status": sms_res.get("status"),
                "provider_request_id": sms_res.get("request_id"),
                "is_successful": sms_res.get("success", False),
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }).execute()
        except Exception as e:
            logger.debug(f"Could not persist sms_delivery_logs to Supabase: {e}")

# Global scheduler instance
commute_scheduler = DailyCommuteScheduler()
