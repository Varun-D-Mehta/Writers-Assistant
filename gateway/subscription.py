"""Subscription management: trial checking, Razorpay integration."""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone

import httpx
from starlette.requests import Request
from starlette.responses import JSONResponse

from auth import get_db, get_user, verify_jwt
from config import settings

logger = logging.getLogger(__name__)


def check_subscription(user_data: dict) -> tuple[bool, str]:
    """Check if a user has active access.

    Returns:
        (has_access, reason) — reason is "active", "trial", "trial_expired", "expired", "cancelled"
    """
    status = user_data.get("subscription_status", "trial")
    now = datetime.now(timezone.utc)

    if status == "trial":
        trial_expires = user_data.get("trial_expires_at")
        if trial_expires and isinstance(trial_expires, datetime) and now < trial_expires:
            return True, "trial"
        return False, "trial_expired"

    if status == "active":
        return True, "active"

    if status == "cancelled":
        expires = user_data.get("subscription_expires_at")
        if expires and isinstance(expires, datetime) and now < expires:
            return True, "cancelled"
        return False, "expired"

    return False, "expired"


async def subscription_middleware(request: Request, user_id: str) -> JSONResponse | None:
    """Check subscription before proxying API requests.

    Returns None if access is granted, or a 403 JSONResponse if denied.
    """
    path = request.url.path
    if path.startswith("/auth/") or path.startswith("/webhooks/"):
        return None

    user_data = await get_user(user_id)
    if not user_data:
        return JSONResponse({"error": "User not found"}, status_code=404)

    has_access, reason = check_subscription(user_data)
    if not has_access:
        return JSONResponse(
            {"error": "Subscription required", "code": reason},
            status_code=403,
        )

    return None


# ── Razorpay Subscription Creation ────────────────────────────────


async def create_razorpay_subscription(request: Request):
    """Create a Razorpay subscription for the authenticated user.

    Returns the subscription ID and Razorpay key for frontend checkout.
    The frontend uses Razorpay's JavaScript checkout widget to complete payment.
    """

    token = request.cookies.get("wa_token")
    if not token:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    payload = verify_jwt(token)
    if not payload:
        return JSONResponse({"error": "Invalid token"}, status_code=401)

    user_data = await get_user(payload["sub"])
    if not user_data:
        return JSONResponse({"error": "User not found"}, status_code=404)

    body = await request.json()
    plan = body.get("plan", "monthly")
    plan_id = settings.razorpay_plan_annual if plan == "annual" else settings.razorpay_plan_monthly

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.razorpay.com/v1/subscriptions",
                auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
                json={
                    "plan_id": plan_id,
                    "total_count": 12 if plan == "annual" else 120,
                    "quantity": 1,
                    "notes": {
                        "user_id": payload["sub"],
                        "email": user_data.get("email", ""),
                    },
                },
            )
            resp.raise_for_status()
            sub = resp.json()

        return JSONResponse({
            "subscription_id": sub["id"],
            "razorpay_key": settings.razorpay_key_id,
            "name": "Writers Assistant",
            "description": f"{'Annual' if plan == 'annual' else 'Monthly'} Subscription",
            "prefill": {
                "name": user_data.get("name", ""),
                "email": user_data.get("email", ""),
            },
        })
    except Exception as e:
        logger.error("Razorpay subscription creation error: %s", e)
        return JSONResponse({"error": "Failed to create subscription"}, status_code=500)


# ── Razorpay Webhook ──────────────────────────────────────────────


async def handle_razorpay_webhook(request: Request):
    """Handle Razorpay webhook events for subscription lifecycle."""
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    # Verify webhook signature
    expected = hmac.new(
        settings.razorpay_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        logger.error("Razorpay webhook signature mismatch")
        return JSONResponse({"error": "Invalid signature"}, status_code=400)

    data = json.loads(body)
    event = data.get("event", "")
    payload = data.get("payload", {})
    logger.info("Razorpay webhook: %s", event)

    if event == "subscription.activated":
        await _activate_subscription(payload)
    elif event == "subscription.charged":
        await _charge_subscription(payload)
    elif event == "subscription.cancelled":
        await _cancel_subscription(payload)
    elif event == "subscription.paused":
        await _pause_subscription(payload)

    return JSONResponse({"ok": True})


async def _activate_subscription(payload: dict):
    """Handle subscription activation."""
    sub = payload.get("subscription", {}).get("entity", {})
    user_id = sub.get("notes", {}).get("user_id")
    if not user_id:
        return

    doc_ref = get_db().collection("users").document(user_id)
    await doc_ref.update({
        "subscription_status": "active",
        "subscription_id": sub.get("id", ""),
        "plan": "annual" if sub.get("plan_id") == settings.razorpay_plan_annual else "monthly",
    })
    logger.info("Subscription activated for user %s", user_id)


async def _charge_subscription(payload: dict):
    """Handle successful subscription charge (renewal)."""
    sub = payload.get("subscription", {}).get("entity", {})
    user_id = sub.get("notes", {}).get("user_id")
    if not user_id:
        return

    doc_ref = get_db().collection("users").document(user_id)
    await doc_ref.update({
        "subscription_status": "active",
        "subscription_expires_at": datetime.fromtimestamp(
            sub.get("current_end", 0), tz=timezone.utc
        ),
    })


async def _cancel_subscription(payload: dict):
    """Handle subscription cancellation."""
    sub = payload.get("subscription", {}).get("entity", {})
    user_id = sub.get("notes", {}).get("user_id")
    if not user_id:
        return

    doc_ref = get_db().collection("users").document(user_id)
    await doc_ref.update({
        "subscription_status": "cancelled",
        "subscription_expires_at": datetime.fromtimestamp(
            sub.get("current_end", 0), tz=timezone.utc
        ),
    })
    logger.info("Subscription cancelled for user %s", user_id)


async def _pause_subscription(payload: dict):
    """Handle subscription pause."""
    sub = payload.get("subscription", {}).get("entity", {})
    user_id = sub.get("notes", {}).get("user_id")
    if not user_id:
        return

    doc_ref = get_db().collection("users").document(user_id)
    await doc_ref.update({"subscription_status": "paused"})
    logger.info("Subscription paused for user %s", user_id)


# ── Subscription Management ──────────────────────────────────────


async def cancel_subscription(request: Request):
    """Cancel the current user's subscription via Razorpay API."""

    token = request.cookies.get("wa_token")
    if not token:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    payload = verify_jwt(token)
    if not payload:
        return JSONResponse({"error": "Invalid token"}, status_code=401)

    user_data = await get_user(payload["sub"])
    if not user_data or not user_data.get("subscription_id"):
        return JSONResponse({"error": "No active subscription"}, status_code=400)

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.razorpay.com/v1/subscriptions/{user_data['subscription_id']}/cancel",
                auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
                json={"cancel_at_cycle_end": 1},  # Cancel at end of billing period
            )
            resp.raise_for_status()
        return JSONResponse({"ok": True, "message": "Subscription will cancel at end of billing period"})
    except Exception as e:
        logger.error("Razorpay cancel error: %s", e)
        return JSONResponse({"error": "Failed to cancel subscription"}, status_code=500)
