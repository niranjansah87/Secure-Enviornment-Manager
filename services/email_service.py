"""
Optional email service for Secure Environment Manager.

If SMTP is not configured, all send operations are no-ops (logged, never raise).
The calling code must never block on email — always fire-and-forget.

Required env vars to enable:
    EMAIL_SMTP_HOST      e.g. smtp.gmail.com
    EMAIL_SMTP_PORT      e.g. 587
    EMAIL_SMTP_USER      e.g. noreply@company.com
    EMAIL_SMTP_PASSWORD  app password / SMTP auth
    EMAIL_FROM           e.g. SEM <noreply@company.com>
"""
import os
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from core.config import logger


def _smtp_config() -> Optional[dict]:
    host = os.environ.get("EMAIL_SMTP_HOST", "").strip()
    if not host:
        return None
    return {
        "host": host,
        "port": int(os.environ.get("EMAIL_SMTP_PORT", "587")),
        "user": os.environ.get("EMAIL_SMTP_USER", ""),
        "password": os.environ.get("EMAIL_SMTP_PASSWORD", ""),
        "from_addr": os.environ.get("EMAIL_FROM", os.environ.get("EMAIL_SMTP_USER", "")),
    }


def _send_raw(to_email: str, subject: str, html_body: str, text_body: str) -> None:
    """Send email synchronously. Called from a background thread."""
    cfg = _smtp_config()
    if not cfg:
        logger.debug("Email not configured — skipping send to %s", to_email)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = cfg["from_addr"]
    msg["To"] = to_email
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(cfg["user"], cfg["password"])
            smtp.sendmail(cfg["from_addr"], [to_email], msg.as_string())
        logger.info("Email sent to %s: %s", to_email, subject)
    except Exception as e:
        logger.warning("Email send failed to %s: %s", to_email, e)


def _fire_and_forget(to_email: str, subject: str, html: str, text: str) -> None:
    """Non-blocking email dispatch. Failures are logged, never raised."""
    if not to_email:
        return
    t = threading.Thread(target=_send_raw, args=(to_email, subject, html, text), daemon=True)
    t.start()


# ------------------------------------------------------------------ #
#  Public API                                                          #
# ------------------------------------------------------------------ #

def send_welcome_email(to_email: str, username: str, temp_password: str) -> None:
    """Send new-account welcome email with temp password. Non-blocking."""
    subject = "Your Secure Environment Manager account"
    text = (
        f"Hi {username},\n\n"
        f"An account has been created for you on Secure Environment Manager.\n\n"
        f"Username:          {username}\n"
        f"Temporary password: {temp_password}\n\n"
        f"You will be asked to change your password on first login.\n\n"
        f"If you did not expect this, contact your administrator.\n"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:32px;
                border:1px solid #e4e4e7;border-radius:12px;">
      <h2 style="color:#7c3aed;margin:0 0 24px">Secure Environment Manager</h2>
      <p>Hi <strong>{username}</strong>,</p>
      <p>An account has been created for you.</p>
      <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px"><strong>Username:</strong> {username}</p>
        <p style="margin:0"><strong>Temporary password:</strong>
          <code style="background:#e4e4e7;padding:2px 6px;border-radius:4px">{temp_password}</code>
        </p>
      </div>
      <p style="color:#71717a;font-size:14px">
        You will be asked to change your password on first login.
      </p>
    </div>
    """
    _fire_and_forget(to_email, subject, html, text)


def send_password_reset_email(to_email: str, username: str, temp_password: str) -> None:
    """Send password reset email with new temp password. Non-blocking."""
    subject = "Your SEM password has been reset"
    text = (
        f"Hi {username},\n\n"
        f"An administrator has reset your Secure Environment Manager password.\n\n"
        f"Username:          {username}\n"
        f"Temporary password: {temp_password}\n\n"
        f"You will be asked to set a new password on next login.\n\n"
        f"If you did not request this, contact your administrator immediately.\n"
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:32px;
                border:1px solid #e4e4e7;border-radius:12px;">
      <h2 style="color:#7c3aed;margin:0 0 24px">Password Reset</h2>
      <p>Hi <strong>{username}</strong>,</p>
      <p>An administrator has reset your password.</p>
      <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:20px 0;">
        <p style="margin:0 0 8px"><strong>Username:</strong> {username}</p>
        <p style="margin:0"><strong>Temporary password:</strong>
          <code style="background:#e4e4e7;padding:2px 6px;border-radius:4px">{temp_password}</code>
        </p>
      </div>
      <p style="color:#71717a;font-size:14px">
        If you did not request this, contact your administrator immediately.
      </p>
    </div>
    """
    _fire_and_forget(to_email, subject, html, text)


def is_email_configured() -> bool:
    """Returns True if SMTP is configured and emails will be sent."""
    return bool(os.environ.get("EMAIL_SMTP_HOST", "").strip())
