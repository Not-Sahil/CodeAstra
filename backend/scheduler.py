"""
Real-Time Incident & Commute Corridor Monitor
Replaces rigid clock schedules with real-time, event-driven alert triggers:
1. Trigger upon active incident detection / escalation along commute corridor.
2. Trigger upon commuter login or manual 'Scan & Notify' request.
3. Multi-channel dispatch (TextBee SMS + Email + In-App).
4. Idempotency and 45-minute cooldown deduplication to prevent repetitive notifications.
"""

import time
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

from backend.sms_service import sms_service
from backend.email_service import email_service
from backend.supabase_service import get_supabase_client
from backend.alert_engine import alert_engine

logger = logging.getLogger("UrbanPulse.CorridorSentinel")

# IST is UTC+05:30
IST_OFFSET = timedelta(hours=5, minutes=30)

class DailyCommuteScheduler:
    """
    Real-time event-driven commute corridor monitor and alert dispatcher.
    Named DailyCommuteScheduler for backward-compatible lifecycle hooks.
    """
    def __init__(self, engine_ref=None):
        self.engine = engine_ref
        self._is_running = False
        self._task: Optional[asyncio.Task] = None
        # Track recent alert dispatches: f"{user_id}_{incident_id}" -> timestamp
        self._dispatched_recent: Dict[str, float] = {}

    def get_ist_now(self) -> datetime:
        return datetime.now(timezone.utc) + IST_OFFSET

    async def start(self, engine_ref=None):
        """Starts the background event-driven corridor monitor loop."""
        if engine_ref:
            self.engine = engine_ref
        if self._is_running:
            return
        self._is_running = True
        self._task = asyncio.create_task(self._monitor_loop())
        logger.info("Real-time Incident & Corridor Monitor started.")

    def stop(self):
        """Stops the background monitor."""
        self._is_running = False
        if self._task:
            self._task.cancel()
        logger.info("Real-time Incident & Corridor Monitor stopped.")

    async def _monitor_loop(self):
        """
        Background loop executing every 45 seconds.
        Evaluates active incidents across opted-in commuters.
        Dispatches immediately when hazards are detected.
        """
        while self._is_running:
            try:
                await self.check_and_dispatch_realtime_alerts()
            except Exception as e:
                logger.error(f"Error in corridor monitor loop: {e}", exc_info=True)
            await asyncio.sleep(45)

    async def check_and_dispatch_due_alerts(self) -> List[Dict[str, Any]]:
        """Backwards-compatible alias for manual/scheduled trigger endpoint."""
        return await self.check_and_dispatch_realtime_alerts()

    async def check_and_dispatch_realtime_alerts(self) -> List[Dict[str, Any]]:
        """
        Scans all registered commuters and evaluates their saved corridors against live incidents.
        Triggers instant SMS and Email notifications when an incident intersects their corridor.
        """
        users = self._get_eligible_users()
        dispatched_results = []

        for user in users:
            try:
                # Use alert_engine to evaluate with built-in deduplication
                alerts = alert_engine.evaluate_alerts_for_user(user)
                if alerts:
                    dispatched_results.extend(alerts)
            except Exception as e:
                logger.warning(f"Error in realtime evaluation for user {user.get('email')}: {e}")

        return dispatched_results

    async def evaluate_and_send_user_alert(self, user: Dict[str, Any], is_login_or_manual: bool = False) -> Dict[str, Any]:
        """
        Evaluates a single user's commute and dispatches SMS and Email alert.
        If is_login_or_manual is True, dispatches status even if corridor is clear.
        """
        phone = user.get("phone")
        email = user.get("email")
        origin = user.get("default_origin") or "Borivali (West)"
        dest = user.get("default_destination") or "Dadar (West)"
        user_name = user.get("full_name") or user.get("name") or "Commuter"
        travel_mode = user.get("preferred_mode") or "DRIVE"

        # 1. Run commute evaluation if engine is available
        route_incidents = []
        eval_res: Dict[str, Any] = {}
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
                logger.warning(f"Error evaluating route for corridor alert: {e}")

        # 2. Build concise, actionable message adhering to single-SMS quota
        orig_short = origin.split("(")[0].strip()[:14]
        dest_short = dest.split("(")[0].strip()[:14]
        first_name = user_name.split()[0][:10]

        has_hazards = len(route_incidents) > 0
        severity_label = "MAJOR" if has_hazards else "CLEAR"

        if has_hazards:
            primary_hazard = route_incidents[0]
            hz_title = primary_hazard.get("title") or primary_hazard.get("type", "Disruption")
            hz_clean = hz_title
            if " at " in hz_clean:
                hz_clean = hz_clean.split(" at ")[-1].strip()
            elif " on " in hz_clean:
                hz_clean = hz_clean.split(" on ")[-1].strip()
            if len(hz_clean) > 28:
                hz_clean = primary_hazard.get("scenario_type") or "Hazard"

            rec_mode = eval_res.get("recommended_mode", "")
            time_saved = eval_res.get("net_time_saved_min", 0)

            if time_saved > 5 and rec_mode:
                sms_message = f"UrbanPulse Alert: Disruption on {orig_short}->{dest_short} near {hz_clean}. Take {rec_mode} to save ~{time_saved}m."
            else:
                eta = eval_res.get("current_eta_min", 45)
                sms_message = f"UrbanPulse Alert: {hz_clean} on {orig_short}->{dest_short}. Est. travel: {eta}m. Check route before leaving."
            
            title = f"Corridor Disruption: {hz_clean} on {orig_short}->{dest_short}"
        else:
            eta = eval_res.get("current_eta_min", 40)
            sms_message = f"UrbanPulse: Hi {first_name}! Your route {orig_short}->{dest_short} is CLEAR. Est. travel: ~{eta}m. Safe journey!"
            title = f"Commute Corridor CLEAR ({orig_short} -> {dest_short})"

        # Ensure single SMS length (<= 158 chars)
        if len(sms_message) > 158:
            sms_message = sms_message[:155] + "..."

        sms_res = {"status": "NOT_REQUESTED", "success": False}
        email_res = {"status": "NOT_REQUESTED", "success": False}

        # 3. Dispatch SMS if phone provided and consent granted
        alert_prefs = user.get("alert_preferences", {})
        sms_allowed = user.get("sms_consent", True) or alert_prefs.get("notify_sms", True)

        if phone and sms_allowed and (has_hazards or is_login_or_manual):
            sms_res = sms_service.send_commute_sms_alert(phone, sms_message)

        # 4. Dispatch Email if email provided
        email_allowed = alert_prefs.get("email_enabled", True) if "email_enabled" in alert_prefs else True
        if email and email_allowed and (has_hazards or is_login_or_manual):
            email_res = email_service.send_commute_alert_email(
                to_email=email,
                user_name=user_name,
                alert_title=title,
                alert_message=sms_message,
                corridor_info={
                    "origin": origin,
                    "destination": dest,
                    "recommended_mode": eval_res.get("recommended_mode", ""),
                    "time_saved_min": eval_res.get("net_time_saved_min", 0),
                    "eta_min": eval_res.get("current_eta_min", 40)
                },
                severity=severity_label
            )

        # 5. Record to Supabase / In-App Notification Center
        self._record_alert_log(user, title, sms_message, sms_res, email_res, severity_label)

        return {
            "user": user_name,
            "corridor": f"{orig_short} -> {dest_short}",
            "has_hazards": has_hazards,
            "incidents_count": len(route_incidents),
            "sms_result": sms_res,
            "email_result": email_res,
            "message": sms_message,
            "title": title
        }

    def _get_eligible_users(self) -> List[Dict[str, Any]]:
        """
        Fetches commuters with configured corridors and notifications enabled.
        Falls back to local profiles if Supabase is offline.
        """
        eligible = []
        sp = get_supabase_client()
        if sp:
            try:
                resp = sp.table("users").select("*").execute()
                if resp.data:
                    for u in resp.data:
                        if u.get("phone") or u.get("email"):
                            eligible.append(u)
                    return eligible
            except Exception as e:
                logger.warning(f"Supabase user fetch failed for corridor monitor: {e}")

        # Fallback to local user profiles
        from backend.auth_service import get_all_users
        for u in get_all_users():
            if u.get("phone") or u.get("email"):
                eligible.append(u)

        return eligible

    def _record_alert_log(
        self,
        user: Dict[str, Any],
        title: str,
        message: str,
        sms_res: Dict[str, Any],
        email_res: Dict[str, Any],
        severity: str
    ):
        """Records alert dispatch in user_notifications and sms_delivery_logs."""
        from backend.supabase_service import save_user_notification

        channels = ["IN_APP"]
        if sms_res.get("success"):
            channels.append("SMS")
        if email_res.get("success"):
            channels.append("EMAIL")

        delivery_status = "DELIVERED" if (sms_res.get("success") or email_res.get("success")) else "LOGGED"

        try:
            save_user_notification({
                "user_id": user.get("id"),
                "user_code": user.get("user_code") or "COMMUTER",
                "alert_type": "COMMUTE",
                "title": title,
                "message": message,
                "severity": "MAJOR" if severity == "MAJOR" else "LOW",
                "channels": channels,
                "delivery_status": delivery_status,
                "is_read": False,
                "evidence_summary": {
                    "source": "REALTIME_CORRIDOR_MONITOR",
                    "sms_status": sms_res.get("status"),
                    "email_status": email_res.get("status")
                },
                "idempotency_key": f"rt_{user.get('user_code')}_{int(time.time() // 900)}"
            })
        except Exception as e_notif:
            logger.debug(f"Could not persist corridor alert to user_notifications: {e_notif}")

        sp = get_supabase_client()
        if not sp or not sms_res.get("success"):
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


# Global instance
commute_scheduler = DailyCommuteScheduler()
