"""
UrbanPulse AI — Email Notification Service
Enterprise-grade email delivery adapter supporting:
1. Standard SMTP dispatch (Gmail, Outlook, AWS SES, SendGrid, custom SMTP).
2. Clean HTML + Plain-text emergency commute alert templates.
3. Idempotency caching and safe fallback simulation when SMTP is unconfigured.
"""

import os
import time
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("UrbanPulse.EmailService")


class EmailAlertService:
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "").strip()
        self.smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
        self.smtp_from = os.getenv("SMTP_FROM", self.smtp_user or "alerts@urbanpulse.ai").strip()
        self.enabled = os.getenv("EMAIL_NOTIFICATIONS_ENABLED", "true").lower() in ("true", "1", "yes")

        # In-memory deduplication cache: hash -> timestamp
        self._sent_hashes: Dict[str, float] = {}

    def is_configured(self) -> bool:
        """Checks if real SMTP credentials are provided in .env."""
        return bool(self.smtp_user and self.smtp_password and "YOUR_" not in self.smtp_user)

    def mask_email(self, email: str) -> str:
        """Returns privacy-safe masked email like s***e@domain.com."""
        if not email or "@" not in email:
            return "***"
        parts = email.split("@")
        name, domain = parts[0], parts[1]
        if len(name) <= 2:
            masked_name = name[0] + "*"
        else:
            masked_name = name[0] + "*" * (len(name) - 2) + name[-1]
        return f"{masked_name}@{domain}"

    def send_commute_alert_email(
        self,
        to_email: str,
        user_name: str,
        alert_title: str,
        alert_message: str,
        corridor_info: Optional[Dict[str, Any]] = None,
        severity: str = "MAJOR"
    ) -> Dict[str, Any]:
        """
        Sends an emergency commute corridor disruption or clear update email.
        """
        if not to_email or "@" not in to_email:
            return {
                "success": False,
                "status": "invalid_email",
                "error": f"Invalid recipient email address: {to_email}"
            }

        # Deduplication check (5 minutes)
        content_hash = f"{to_email.strip().lower()}:{alert_title}:{alert_message[:50]}"
        last_sent = self._sent_hashes.get(content_hash, 0)
        if time.time() - last_sent < 300:
            return {
                "success": True,
                "status": "duplicate_suppressed",
                "message": "Duplicate email suppressed by deduplication guard within 5 minutes."
            }

        corridor_info = corridor_info or {}
        origin = corridor_info.get("origin", "Saved Origin")
        destination = corridor_info.get("destination", "Saved Destination")
        recommended_mode = corridor_info.get("recommended_mode", "")
        time_saved = corridor_info.get("time_saved_min", 0)
        eta_min = corridor_info.get("eta_min", 45)

        # Subject Line
        severity_tag = "🚨 [CRITICAL HAZARD]" if "CRITICAL" in severity.upper() else ("⚠️ [COMMUTE ALERT]" if "MAJOR" in severity.upper() else "ℹ️ [URBANPULSE UPDATE]")
        subject = f"{severity_tag} {alert_title} ({origin.split('(')[0].strip()} -> {destination.split('(')[0].strip()})"

        # HTML Body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 14px; overflow: hidden; border: 1px solid #334155; }}
            .header {{ background: linear-gradient(135deg, #0284c7, #2563eb); padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 22px; color: #ffffff; letter-spacing: -0.5px; }}
            .header p {{ margin: 6px 0 0; color: #bae6fd; font-size: 13px; }}
            .content {{ padding: 24px; }}
            .badge {{ display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 11px; text-transform: uppercase; }}
            .badge-critical {{ background: #fee2e2; color: #991b1b; }}
            .badge-major {{ background: #fef3c7; color: #92400e; }}
            .badge-clear {{ background: #dcfce7; color: #166534; }}
            .alert-box {{ background: #0f172a; border-left: 4px solid #38bdf8; padding: 16px; border-radius: 8px; margin: 16px 0; }}
            .route-info {{ display: flex; justify-content: space-between; background: #334155; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; }}
            .rec-box {{ background: #064e3b; border: 1px solid #059669; padding: 14px; border-radius: 8px; margin: 16px 0; }}
            .footer {{ text-align: center; padding: 18px; color: #94a3b8; font-size: 11px; border-top: 1px solid #334155; }}
            .btn {{ display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; margin-top: 12px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>UrbanPulse AI Emergency Corridor Alert</h1>
              <p>Personalized Multimodal Commute Intelligence — Mumbai</p>
            </div>
            <div class="content">
              <p style="font-size: 15px; margin-top: 0;">Hi <strong>{user_name}</strong>,</p>
              
              <div class="alert-box">
                <div style="margin-bottom: 8px;">
                  <span class="badge {'badge-critical' if 'CRITICAL' in severity.upper() else 'badge-major'}">{severity} IMPACT</span>
                </div>
                <h3 style="margin: 0 0 8px 0; color: #ffffff; font-size: 16px;">{alert_title}</h3>
                <p style="margin: 0; color: #cbd5e1; font-size: 13.5px; line-height: 1.5;">{alert_message}</p>
              </div>

              <div style="background: #0f172a; border-radius: 8px; padding: 14px; margin: 16px 0;">
                <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Evaluated Corridor</div>
                <div style="font-size: 14px; color: #f1f5f9; font-weight: 600;">{origin} &rarr; {destination}</div>
                <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Expected Travel Time: ~{eta_min} mins</div>
              </div>

              {f'''
              <div class="rec-box">
                <div style="font-size: 12px; color: #a7f3d0; font-weight: 700; text-transform: uppercase;">Recommended Alternate Route</div>
                <div style="font-size: 14px; color: #ffffff; font-weight: 600; margin-top: 4px;">Take {recommended_mode}</div>
                <div style="font-size: 12px; color: #6ee7b7; margin-top: 2px;">Estimated net time saved: ~{time_saved} minutes</div>
              </div>
              ''' if recommended_mode and time_saved > 0 else ''}

              <div style="text-align: center; margin-top: 20px;">
                <a href="http://localhost:5174" class="btn">View Live Hazard Map & Radar</a>
              </div>
            </div>
            <div class="footer">
              This personalized alert was dispatched automatically based on your saved corridor and registered incident perimeter.<br>
              UrbanPulse AI &bull; Mumbai Multimodal Urban Incident Intelligence
            </div>
          </div>
        </body>
        </html>
        """

        # Plain Text Fallback
        plain_text = f"""UrbanPulse AI Emergency Corridor Alert: {alert_title}

Hi {user_name},

A commute disruption has been detected on your route:
Route: {origin} -> {destination}
Severity: {severity}
Details: {alert_message}

Expected Travel Time: ~{eta_min} mins
{f"Recommended Alternate: Take {recommended_mode} to save ~{time_saved} minutes" if recommended_mode and time_saved > 0 else ""}

View live details: http://localhost:5174
"""

        # If SMTP is configured, send live email
        if self.is_configured() and self.enabled:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = self.smtp_from
                msg["To"] = to_email
                msg.attach(MIMEText(plain_text, "plain"))
                msg.attach(MIMEText(html_body, "html"))

                with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                    server.starttls()
                    server.login(self.smtp_user, self.smtp_password)
                    server.sendmail(self.smtp_from, [to_email], msg.as_string())

                self._sent_hashes[content_hash] = time.time()
                logger.info(f"Dispatched live email alert to {self.mask_email(to_email)}")
                return {
                    "success": True,
                    "status": "email_delivered",
                    "recipient": self.mask_email(to_email),
                    "subject": subject,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }
            except Exception as e:
                logger.error(f"SMTP dispatch failed: {e}")
                return {
                    "success": False,
                    "status": "smtp_error",
                    "error": str(e),
                    "recipient": self.mask_email(to_email)
                }

        # Otherwise, perform simulated/audit delivery
        self._sent_hashes[content_hash] = time.time()
        logger.info(f"[EMAIL SIMULATION] Alert generated for {self.mask_email(to_email)}: {subject}")
        return {
            "success": True,
            "status": "email_simulated",
            "mode": "AUDIT_OR_UNCONFIGURED_SMTP",
            "recipient": self.mask_email(to_email),
            "subject": subject,
            "preview_summary": alert_message[:120],
            "note": "SMTP credentials not configured in .env (SMTP_USER/SMTP_PASSWORD). Email payload logged and mirrored into Notification Center.",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }


# Global singleton
email_service = EmailAlertService()
