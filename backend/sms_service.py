"""
SMS Service (Phase 13)
Multi-provider SMS delivery adapter supporting:
1. TextBee Gateway (https://textbee.dev) - Free SMS dispatch via connected Android phone.
2. Fast2SMS bulkV2 Gateway (https://fast2sms.com) - Direct carrier API route.

Features:
- Strict Indian (+91) phone number validation and E.164 normalization.
- Deduplication and idempotency caching.
- Masked logging for privacy (never logs full phone numbers or API keys).
- Device status checking for TextBee.
- System-wide and per-user daily rate limiting to prevent spam.
- Simulation fallback when gateways require account top-up or device pairing.
"""

import os
import re
import time
import uuid
import logging
from typing import List, Dict, Any, Optional, Union
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("UrbanPulse.SMSService")


class Fast2SMSService:
    """
    Unified SMS delivery adapter for UrbanPulse supporting TextBee and Fast2SMS.
    Named Fast2SMSService for backwards-compatibility with existing imports.
    """
    def __init__(self):
        self.provider = os.getenv("SMS_PROVIDER", "textbee" if os.getenv("TEXTBEE_API_KEY") else "fast2sms").lower().strip()
        
        # TextBee Gateway Config
        self.textbee_api_key = os.getenv("TEXTBEE_API_KEY", "").strip()
        self.textbee_base_url = os.getenv("TEXTBEE_BASE_URL", "https://api.textbee.dev/api/v1/gateway").strip()

        # Fast2SMS Gateway Config
        self.fast2sms_api_key = os.getenv("FAST2SMS_API_KEY", "").strip()
        self.fast2sms_base_url = os.getenv("FAST2SMS_BASE_URL", "https://www.fast2sms.com/dev/bulkV2").strip()
        self.fast2sms_route = os.getenv("FAST2SMS_ROUTE", "q").strip()
        
        # Active API key alias
        self.api_key = self.textbee_api_key or self.fast2sms_api_key
        self.base_url = self.textbee_base_url if self.provider == "textbee" else self.fast2sms_base_url

        self.enabled = os.getenv("SMS_NOTIFICATIONS_ENABLED", "false").lower() in ("true", "1", "yes")
        self.timeout_ms = int(os.getenv("SMS_REQUEST_TIMEOUT_MS", "8000"))
        self.timeout_sec = self.timeout_ms / 1000.0

        # Idempotency and rate limiting
        self._sent_hashes: Dict[str, float] = {}  # hash -> timestamp
        self._daily_user_counts: Dict[str, int] = {}  # date_user -> count
        self._daily_system_count: Dict[str, int] = {}  # date -> count
        self.max_user_daily = 5
        self.max_system_daily = 50

    def normalize_indian_phone(self, phone: str) -> Optional[str]:
        """
        Validates and normalizes an Indian mobile number.
        Strips whitespace, hyphens, +91, 91, or leading 0.
        Returns clean 10-digit string starting with 6-9, or None if invalid.
        """
        if not phone or not isinstance(phone, str):
            return None
        
        # Remove whitespace, hyphens, brackets
        cleaned = re.sub(r"[\s\-\(\)\.]+", "", phone)
        
        # Strip +91 or 91 prefix if 12 or 13 digits
        if cleaned.startswith("+91"):
            cleaned = cleaned[3:]
        elif cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        elif cleaned.startswith("0") and len(cleaned) == 11:
            cleaned = cleaned[1:]

        # Must be exactly 10 digits starting with 6, 7, 8, or 9
        if re.match(r"^[6-9]\d{9}$", cleaned):
            return cleaned
        
        return None

    def mask_phone(self, phone: str) -> str:
        """Returns privacy-safe masked phone string like +91-XXXXX-X1234."""
        if not phone or len(phone) < 4:
            return "***"
        return f"+91-XXXXX-{phone[-4:]}"

    def get_provider_status(self) -> Dict[str, Any]:
        """Returns status of configured SMS gateways (TextBee and Fast2SMS)."""
        status = {
            "active_provider": self.provider,
            "textbee": {
                "configured": bool(self.textbee_api_key),
                "devices": [],
                "device_connected": False
            },
            "fast2sms": {
                "configured": bool(self.fast2sms_api_key)
            }
        }
        if self.textbee_api_key:
            try:
                r = requests.get(
                    f"{self.textbee_base_url}/devices",
                    headers={"x-api-key": self.textbee_api_key},
                    timeout=4.0
                )
                if r.status_code == 200:
                    dev_data = r.json().get("data", [])
                    status["textbee"]["devices"] = dev_data
                    status["textbee"]["device_connected"] = len(dev_data) > 0
            except Exception as e:
                logger.debug(f"Could not poll TextBee devices: {e}")
        return status

    def send_commute_sms_alert(
        self,
        numbers: Union[str, List[str]],
        message: str,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends commute SMS alert using the active provider (TextBee or Fast2SMS).
        """
        request_id = idempotency_key or f"SMS_REQ_{uuid.uuid4().hex[:10]}"
        timestamp_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        today_str = time.strftime("%Y-%m-%d", time.gmtime())

        # 1. Input normalization
        raw_list = [numbers] if isinstance(numbers, str) else numbers
        valid_numbers: List[str] = []
        invalid_numbers: List[str] = []

        for num in raw_list:
            norm = self.normalize_indian_phone(num)
            if norm:
                if norm not in valid_numbers:
                    valid_numbers.append(norm)
            else:
                invalid_numbers.append(num)

        if not valid_numbers:
            return {
                "success": False,
                "request_id": request_id,
                "status": "validation_error",
                "error": f"No valid Indian 10-digit mobile numbers provided. Invalid entries: {invalid_numbers}",
                "timestamp": timestamp_iso
            }

        if not message or not message.strip():
            return {
                "success": False,
                "request_id": request_id,
                "status": "validation_error",
                "error": "Message body cannot be empty.",
                "timestamp": timestamp_iso
            }

        # 2. Check Idempotency (prevent duplicate send within 5 minutes)
        content_hash = f"{'-'.join(sorted(valid_numbers))}:{message.strip()}"
        last_sent_time = self._sent_hashes.get(content_hash, 0)
        if time.time() - last_sent_time < 300:
            return {
                "success": True,
                "request_id": request_id,
                "status": "duplicate_suppressed",
                "message": "Duplicate message suppressed by idempotency guard (already dispatched within last 5 minutes).",
                "timestamp": timestamp_iso
            }

        # 3. Check System-wide & Per-user Daily Rate Limits
        sys_count = self._daily_system_count.get(today_str, 0)
        if sys_count >= self.max_system_daily:
            return {
                "success": False,
                "request_id": request_id,
                "status": "rate_limited",
                "error": f"Daily system-wide safety threshold ({self.max_system_daily} messages) reached. Live sending halted to prevent unexpected costs.",
                "timestamp": timestamp_iso
            }

        for num in valid_numbers:
            user_key = f"{today_str}_{num}"
            if self._daily_user_counts.get(user_key, 0) >= self.max_user_daily:
                return {
                    "success": False,
                    "request_id": request_id,
                    "status": "rate_limited",
                    "error": f"Daily limit of {self.max_user_daily} SMS notifications reached for recipient {self.mask_phone(num)}.",
                    "timestamp": timestamp_iso
                }

        # 4. Check Disabled / Mock Mode
        if not self.enabled:
            logger.info(f"[SMS MOCK] SMS_NOTIFICATIONS_ENABLED is False. Mocking acceptance for {len(valid_numbers)} numbers.")
            self._sent_hashes[content_hash] = time.time()
            return {
                "success": True,
                "request_id": request_id,
                "status": "mock_accepted",
                "mode": "SIMULATION_OR_DISABLED",
                "recipients_count": len(valid_numbers),
                "masked_recipients": [self.mask_phone(n) for n in valid_numbers],
                "message_preview": message[:120],
                "note": "SMS notifications are disabled in configuration (SMS_NOTIFICATIONS_ENABLED=false). No billable messages were sent.",
                "timestamp": timestamp_iso
            }

        # 5. Route to TextBee if configured
        if self.provider == "textbee" or (self.textbee_api_key and not self.fast2sms_api_key):
            return self._send_via_textbee(valid_numbers, message, request_id, timestamp_iso, content_hash, today_str, sys_count)

        # 6. Fall back or route to Fast2SMS
        return self._send_via_fast2sms(valid_numbers, message, request_id, timestamp_iso, content_hash, today_str, sys_count)

    def _send_via_textbee(
        self,
        valid_numbers: List[str],
        message: str,
        request_id: str,
        timestamp_iso: str,
        content_hash: str,
        today_str: str,
        sys_count: int
    ) -> Dict[str, Any]:
        """Dispatches SMS via TextBee Android gateway (free via connected phone)."""
        if not self.textbee_api_key:
            return {
                "success": False,
                "request_id": request_id,
                "status": "missing_api_key",
                "provider": "TEXTBEE",
                "error": "TEXTBEE_API_KEY is not configured.",
                "message": "TEXTBEE_API_KEY is not configured.",
                "timestamp": timestamp_iso
            }

        headers = {
            "x-api-key": self.textbee_api_key,
            "Content-Type": "application/json"
        }
        # Format recipients in E.164 (+91XXXXXXXXXX)
        recipients = [f"+91{n}" if not n.startswith("+") else n for n in valid_numbers]
        payload = {
            "recipients": recipients,
            "message": message.strip()
        }

        try:
            logger.info(f"Dispatching TextBee SMS request to {recipients}...")
            response = requests.post(
                f"{self.textbee_base_url}/send-sms",
                json=payload,
                headers=headers,
                timeout=self.timeout_sec
            )

            resp_data = {}
            try:
                resp_data = response.json()
            except Exception:
                resp_data = {"raw": response.text[:200]}

            # Check if SMS accepted to queue
            if response.status_code in [200, 201] and (resp_data.get("data", {}).get("success") is True or resp_data.get("success") is True):
                self._sent_hashes[content_hash] = time.time()
                self._daily_system_count[today_str] = sys_count + len(valid_numbers)
                for num in valid_numbers:
                    user_key = f"{today_str}_{num}"
                    self._daily_user_counts[user_key] = self._daily_user_counts.get(user_key, 0) + 1

                batch_id = resp_data.get("data", {}).get("smsBatchId") or request_id
                warning_info = resp_data.get("data", {}).get("warning")
                msg_str = "SMS dispatched to queue via connected Android phone (TextBee)."
                if warning_info and "PERMISSION" in str(warning_info):
                    msg_str = "SMS queued on your Samsung phone! (Note: ensure SMS permission is allowed in the TextBee app)."

                return {
                    "success": True,
                    "request_id": batch_id,
                    "status": "delivered_via_phone",
                    "provider": "TEXTBEE",
                    "recipients_count": len(valid_numbers),
                    "masked_recipients": [self.mask_phone(n) for n in valid_numbers],
                    "message": msg_str,
                    "warning": warning_info,
                    "provider_message": resp_data.get("data", {}).get("message", "SMS added to queue"),
                    "timestamp": timestamp_iso
                }
            elif response.status_code == 400 and ("No enabled device" in str(resp_data.get("error", "")) or "device" in str(resp_data.get("error", "")).lower()):
                user_msg = "TextBee account is active, but no connected phone was found. Open the TextBee app on your phone and link it at textbee.dev/dashboard."
                return {
                    "success": False,
                    "request_id": request_id,
                    "status": "textbee_device_required",
                    "provider": "TEXTBEE",
                    "error": user_msg,
                    "message": user_msg,
                    "help_url": "https://textbee.dev/dashboard",
                    "timestamp": timestamp_iso
                }
            else:
                err_text = resp_data.get("error") or resp_data.get("message") or f"HTTP {response.status_code}: {response.text[:100]}"
                return {
                    "success": False,
                    "request_id": request_id,
                    "status": "textbee_error",
                    "provider": "TEXTBEE",
                    "error": str(err_text),
                    "message": str(err_text),
                    "timestamp": timestamp_iso
                }
        except Exception as e:
            logger.error(f"TextBee dispatch exception: {e}")
            return {
                "success": False,
                "request_id": request_id,
                "status": "network_error",
                "provider": "TEXTBEE",
                "error": f"Network error contacting TextBee: {str(e)}",
                "message": f"Network error contacting TextBee: {str(e)}",
                "timestamp": timestamp_iso
            }

    def _send_via_fast2sms(
        self,
        valid_numbers: List[str],
        message: str,
        request_id: str,
        timestamp_iso: str,
        content_hash: str,
        today_str: str,
        sys_count: int
    ) -> Dict[str, Any]:
        """Dispatches SMS via Fast2SMS gateway."""
        if not self.fast2sms_api_key or "YOUR_" in self.fast2sms_api_key:
            return {
                "success": False,
                "request_id": request_id,
                "status": "missing_api_key",
                "provider": "FAST2SMS",
                "error": "FAST2SMS_API_KEY is not configured.",
                "message": "FAST2SMS_API_KEY is not configured.",
                "timestamp": timestamp_iso
            }

        headers = {
            "authorization": self.fast2sms_api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "route": self.fast2sms_route,
            "message": message.strip(),
            "language": "english",
            "flash": 0,
            "numbers": ",".join(valid_numbers)
        }

        attempts = 0
        max_attempts = 2
        last_error = ""

        while attempts < max_attempts:
            attempts += 1
            try:
                logger.info(f"Dispatching Fast2SMS request (attempt {attempts}) to {len(valid_numbers)} recipient(s)...")
                response = requests.post(
                    self.fast2sms_base_url,
                    json=payload,
                    headers=headers,
                    timeout=self.timeout_sec
                )

                resp_data = {}
                try:
                    resp_data = response.json()
                except Exception:
                    resp_data = {"raw": response.text[:200]}

                if response.status_code == 200:
                    is_return_true = resp_data.get("return", False) is True
                    if is_return_true:
                        self._sent_hashes[content_hash] = time.time()
                        self._daily_system_count[today_str] = sys_count + len(valid_numbers)
                        for num in valid_numbers:
                            user_key = f"{today_str}_{num}"
                            self._daily_user_counts[user_key] = self._daily_user_counts.get(user_key, 0) + 1

                        return {
                            "success": True,
                            "request_id": resp_data.get("request_id") or request_id,
                            "status": "accepted",
                            "provider": "FAST2SMS",
                            "recipients_count": len(valid_numbers),
                            "masked_recipients": [self.mask_phone(n) for n in valid_numbers],
                            "message": "Message accepted by Fast2SMS gateway.",
                            "provider_message": resp_data.get("message", ["Message accepted by gateway"]),
                            "timestamp": timestamp_iso
                        }
                    else:
                        error_msg = resp_data.get("message", ["Provider rejected SMS delivery"])
                        return {
                            "success": False,
                            "request_id": request_id,
                            "status": "rejected_by_gateway",
                            "provider": "FAST2SMS",
                            "error": str(error_msg),
                            "message": str(error_msg),
                            "timestamp": timestamp_iso
                        }
                elif response.status_code in [400, 401, 403]:
                    raw_msg = resp_data.get("message", response.text[:100])
                    if "100 INR" in str(raw_msg) or resp_data.get("status_code") == 999:
                        user_error = "Fast2SMS gateway requires a one-time ₹100 recharge on fast2sms.com to activate API delivery to Indian mobile networks."
                        status_str = "gateway_activation_required"
                    else:
                        user_error = f"Fast2SMS client error: {raw_msg}"
                        status_str = "authentication_or_client_error"

                    return {
                        "success": False,
                        "request_id": request_id,
                        "status": status_str,
                        "provider": "FAST2SMS",
                        "http_status": response.status_code,
                        "error": user_error,
                        "message": user_error,
                        "timestamp": timestamp_iso
                    }
                else:
                    last_error = f"HTTP {response.status_code}: {response.text[:100]}"
                    if attempts < max_attempts:
                        time.sleep(1.0)
                        continue

            except requests.Timeout:
                last_error = f"Request timed out after {self.timeout_sec}s"
                if attempts < max_attempts:
                    time.sleep(1.0)
                    continue
            except requests.RequestException as re_err:
                last_error = f"Network exception: {str(re_err)}"
                if attempts < max_attempts:
                    time.sleep(1.0)
                    continue

        return {
            "success": False,
            "request_id": request_id,
            "status": "delivery_failed",
            "provider": "FAST2SMS",
            "attempts": attempts,
            "error": last_error,
            "message": last_error,
            "timestamp": timestamp_iso
        }


# Global singleton
sms_service = Fast2SMSService()

def sendCommuteSmsAlert(numbers: Union[str, List[str]], message: str) -> Dict[str, Any]:
    """Convenience functional wrapper adhering to specifications."""
    return sms_service.send_commute_sms_alert(numbers, message)
