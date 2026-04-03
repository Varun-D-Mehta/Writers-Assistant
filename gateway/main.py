"""Gateway service: auth, subscription, session orchestration, reverse proxy."""

import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.requests import Request

from auth import handle_google_callback, handle_google_login, handle_logout, handle_me
from config import settings
from proxy import proxy_request
from session_manager import idle_reaper_loop, manager
from subscription import create_checkout_session, handle_stripe_webhook

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Writers Assistant Gateway")

# Session middleware for OAuth state (authlib needs this)
app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Start the idle session reaper background task."""
    asyncio.create_task(idle_reaper_loop())
    logger.info("Gateway started — idle reaper running every 60s")


# ── Auth routes ───────────────────────────────────────────────────

@app.get("/auth/google")
async def auth_google(request: Request):
    return await handle_google_login(request)


@app.get("/auth/callback")
async def auth_callback(request: Request):
    return await handle_google_callback(request)


@app.get("/auth/me")
async def auth_me(request: Request):
    return await handle_me(request)


@app.post("/auth/logout")
async def auth_logout(request: Request):
    from auth import verify_jwt
    token = request.cookies.get("wa_token")
    if token:
        payload = verify_jwt(token)
        if payload:
            await manager.destroy_user_sessions(payload["sub"])
    return await handle_logout(request)


# ── Subscription routes ───────────────────────────────────────────

@app.post("/subscribe")
async def subscribe(request: Request):
    return await create_checkout_session(request)


@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    return await handle_stripe_webhook(request)


# ── Session management ────────────────────────────────────────────

@app.post("/api/session/end")
async def session_end(request: Request):
    """Called by frontend on tab close (via sendBeacon)."""
    token = request.cookies.get("wa_token")
    if token:
        from auth import verify_jwt
        payload = verify_jwt(token)
        if payload:
            await manager.destroy_session(payload["sid"])
    return {"ok": True}


# ── Catch-all proxy to worker machines ────────────────────────────

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy_all(request: Request):
    return await proxy_request(request)


# ── Health check ──────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "active_sessions": len(manager.sessions),
    }
