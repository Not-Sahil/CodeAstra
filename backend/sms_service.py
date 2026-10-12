"""
Fast2SMS Service (Phase 13)
Enterprise-grade SMS delivery adapter for Fast2SMS (bulkV2 API, route=q).
Features:
- Strict Indian (+91) phone number validation and normalization.
- Deduplication and idempotency caching.
- Masked logging for privacy (never logs full phone numbers or API keys).
- Configurable timeout (default 8000ms) and bounded retry for transient errors.
- System-wide and per-user daily rate limiting to prevent billing spikes.
- Mocked test execution when SMS_NOTIFICATIONS_ENABLED is false.
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
logger = logging.getLogger("UrbanPulse.Fast2SMS")

class Fast2SMSService:
    def __init__(self):
        self.api_key = os.getenv("FAST2SMS_API_KEY", "").strip()
        self.base_url = os.getenv("FAST2SMS_BASE_URL", "https://www.fast2sms.com/dev/bulkV2").strip()
        self.route = os.getenv("FAST2SMS_ROUTE", "q").strip()
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

    def send_commute_sms_alert(
        self,
        numbers: Union[str, List[str]],
        message: str,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends commute SMS alert via Fast2SMS bulkV2 route=q.
        Supports single number or list of numbers.
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

        # 5. Check API Key
        if not self.api_key or "YOUR_" in self.api_key:
            return {
                "success": False,
                "request_id": request_id,
                "status": "missing_api_key",
                "error": "FAST2SMS_API_KEY is not configured. Please supply a valid key in environment variables to send live SMS.",
                "timestamp": timestamp_iso
            }

        # 6. Execute Provider Request with 1 Retry for transient errors
        headers = {
            "authorization": self.api_key,
            "Content-Type": "application/json"
        }
        payload = {
            "route": self.route,
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
                    self.base_url,
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
                    # Fast2SMS returns return: true or return: false
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
                            "timestamp": timestamp_iso
                        }
                elif response.status_code in [400, 401, 403]:
                    # Client or authentication error - DO NOT RETRY
                    return {
                        "success": False,
                        "request_id": request_id,
                        "status": "authentication_or_client_error",
                        "http_status": response.status_code,
                        "error": f"Fast2SMS client error: {resp_data.get('message', response.text[:100])}",
                        "timestamp": timestamp_iso
                    }
                else:
                    # Server error 5xx - retry once
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
            "attempts": attempts,
            "error": last_error,
            "timestamp": timestamp_iso
        }

# Global singleton
sms_service = Fast2SMSService()

def sendCommuteSmsAlert(numbers: Union[str, List[str]], message: str) -> Dict[str, Any]:
    """Convenience functional wrapper adhering to Phase 13 specifications."""
    return sms_service.send_commute_sms_alert(numbers, message)
