"""Subscription management: trial checking, Stripe webhooks."""

import logging
from datetime import datetime, timezone

import stripe
from starlette.requests import Request
from starlette.responses import JSONResponse

from auth import db, get_user, verify_jwt
from config import settings

logger = logging.getLogger(__name__)

stripe.api_key = settings.stripe_secret_key


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
            return True, "cancelled"  # Still has access until period ends
        return False, "expired"

    return False, "expired"


async def subscription_middleware(request: Request, user_id: str) -> JSONResponse | None:
    """Check subscription before proxying API requests.

    Returns None if access is granted, or a 403 JSONResponse if denied.
    """
    # Skip subscription check for auth routes and webhooks
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


# ── Stripe Checkout ───────────────────────────────────────────────


async def create_checkout_session(request: Request):
    """Create a Stripe Checkout session for subscribing."""
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
    price_id = settings.stripe_price_annual if plan == "annual" else settings.stripe_price_monthly

    try:
        session = stripe.checkout.Session.create(
            customer_email=user_data.get("email"),
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{settings.frontend_url}?subscribed=true",
            cancel_url=f"{settings.frontend_url}?subscribed=false",
            metadata={"user_id": payload["sub"]},
        )
        return JSONResponse({"checkout_url": session.url})
    except Exception as e:
        logger.error("Stripe checkout error: %s", e)
        return JSONResponse({"error": "Failed to create checkout session"}, status_code=500)


# ── Stripe Webhooks ───────────────────────────────────────────────


async def handle_stripe_webhook(request: Request):
    """Handle Stripe webhook events for subscription lifecycle."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.error("Stripe webhook verification failed: %s", e)
        return JSONResponse({"error": "Invalid signature"}, status_code=400)

    event_type = event["type"]
    data = event["data"]["object"]
    logger.info("Stripe webhook: %s", event_type)

    if event_type == "checkout.session.completed":
        user_id = data.get("metadata", {}).get("user_id")
        subscription_id = data.get("subscription")
        if user_id and subscription_id:
            await _activate_subscription(user_id, subscription_id)

    elif event_type == "customer.subscription.deleted":
        await _cancel_subscription(data)

    elif event_type == "customer.subscription.updated":
        await _update_subscription(data)

    return JSONResponse({"ok": True})


async def _activate_subscription(user_id: str, subscription_id: str):
    """Activate a user's subscription after successful checkout."""
    sub = stripe.Subscription.retrieve(subscription_id)
    doc_ref = db.collection("users").document(user_id)
    await doc_ref.update({
        "subscription_status": "active",
        "subscription_id": subscription_id,
        "subscription_expires_at": datetime.fromtimestamp(
            sub["current_period_end"], tz=timezone.utc
        ),
        "plan": "annual" if "annual" in sub["items"]["data"][0]["price"]["id"] else "monthly",
    })
    logger.info("Subscription activated for user %s", user_id)


async def _cancel_subscription(sub_data: dict):
    """Handle subscription cancellation."""
    sub_id = sub_data.get("id")
    # Find user by subscription_id
    query = db.collection("users").where("subscription_id", "==", sub_id).limit(1)
    docs = [doc async for doc in query.stream()]
    if docs:
        await docs[0].reference.update({
            "subscription_status": "cancelled",
            "subscription_expires_at": datetime.fromtimestamp(
                sub_data.get("current_period_end", 0), tz=timezone.utc
            ),
        })
        logger.info("Subscription cancelled for sub %s", sub_id)


async def _update_subscription(sub_data: dict):
    """Handle subscription updates (renewal, plan change)."""
    sub_id = sub_data.get("id")
    query = db.collection("users").where("subscription_id", "==", sub_id).limit(1)
    docs = [doc async for doc in query.stream()]
    if docs:
        status = "active" if sub_data.get("status") == "active" else sub_data.get("status", "active")
        await docs[0].reference.update({
            "subscription_status": status,
            "subscription_expires_at": datetime.fromtimestamp(
                sub_data.get("current_period_end", 0), tz=timezone.utc
            ),
        })
