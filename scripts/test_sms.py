#!/usr/bin/env python3
"""
UrbanPulse Fast2SMS Automated Test CLI (Phase 13.F)
Usage:
  python scripts/test_sms.py <INDIAN_MOBILE_NUMBER>

Validates recipient number format, checks configuration & consent flags,
and dispatches an authorized test alert via Fast2SMS route=q.
"""

import sys
import os

# Add root directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv()

from backend.sms_service import sms_service

def main():
    if len(sys.argv) < 2:
        print("\n[ERROR] Missing required phone number argument.")
        print("Usage: python scripts/test_sms.py <TEST_PHONE_NUMBER>")
        print("Example: python scripts/test_sms.py 9820123456\n")
        sys.exit(1)

    phone_arg = sys.argv[1].strip()
    norm_phone = sms_service.normalize_indian_phone(phone_arg)
    if not norm_phone:
        print(f"\n[ERROR] '{phone_arg}' is not a valid 10-digit Indian mobile number.")
        print("Indian numbers must consist of 10 digits starting with 6, 7, 8, or 9.")
        sys.exit(1)

    print("==================================================")
    print("      UrbanPulse AI - Fast2SMS Verification       ")
    print("==================================================")
    print(f"Target Recipient: {sms_service.mask_phone(norm_phone)}")
    print(f"Gateway URL:      {sms_service.base_url}")
    print(f"Route:            {sms_service.route}")
    print(f"SMS Enabled:      {sms_service.enabled}")
    print(f"API Key Present:  {'YES' if bool(sms_service.api_key and 'YOUR_' not in sms_service.api_key) else 'NO'}")
    print("--------------------------------------------------")

    test_message = (
        "UrbanPulse Alert: Moderate rainfall and waterlogging detected along Western Express Hwy corridor. "
        "Allow +15 mins buffer on your morning commute."
    )

    result = sms_service.send_commute_sms_alert(norm_phone, test_message)

    print("\nResult:")
    print(f"Status:     {result.get('status')}")
    print(f"Success:    {result.get('success')}")
    print(f"Request ID: {result.get('request_id')}")
    
    if result.get("error"):
        print(f"Error:      {result.get('error')}")

    if result.get("note"):
        print(f"Note:       {result.get('note')}")

    if result.get("provider_message"):
        print(f"Provider:   {result.get('provider_message')}")

    print("==================================================")

    if result.get("success"):
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
