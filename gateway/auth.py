"""Google OAuth authentication and JWT token management."""

import logging
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from starlette.responses import JSONResponse, RedirectResponse

from config import settings

logger = logging.getLogger(__name__)

# Firestore client — lazily initialized so gateway starts without GCP credentials in dev
db = None


def get_db():
    global db
    if db is None:
        import os
        from pathlib import Path
        from google.cloud import firestore
        from google.oauth2 import service_account

        # Try explicit credentials file first, then fall back to ADC
        creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
        if creds_path and Path(creds_path).exists():
            credentials = service_account.Credentials.from_service_account_file(creds_path)
            db = firestore.AsyncClient(credentials=credentials, project=credentials.project_id)
        else:
            db = firestore.AsyncClient()
    return db

# OAuth setup
oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


def create_jwt(user_id: str, session_id: str) -> str:
    """Create a JWT token for an authenticated user session."""
    payload = {
        "sub": user_id,
        "sid": session_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_jwt(token: str) -> dict | None:
    """Verify and decode a JWT token. Returns payload or None if invalid."""
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.InvalidTokenError:
        return None


async def upsert_user(google_user: dict) -> dict:
    """Create or update a user in Firestore from Google profile data.

    On first login, initializes a 7-day free trial.
    """
    user_id = google_user["sub"]
    doc_ref = get_db().collection("users").document(user_id)
    doc = await doc_ref.get()
    now = datetime.now(timezone.utc)

    if doc.exists:
        # Existing user — update last login
        user_data = doc.to_dict()
        await doc_ref.update({"last_login": now})
        user_data["last_login"] = now
        return user_data
    else:
        # New user — create with 7-day trial
        user_data = {
            "user_id": user_id,
            "email": google_user.get("email", ""),
            "name": google_user.get("name", ""),
            "profile_pic": google_user.get("picture", ""),
            "created_at": now,
            "last_login": now,
            "subscription_status": "trial",
            "trial_started_at": now,
            "trial_expires_at": now + timedelta(days=7),
            "subscription_id": "",
            "subscription_expires_at": None,
            "plan": "free_trial",
        }
        await doc_ref.set(user_data)
        logger.info("New user created: %s (%s)", user_data["email"], user_id)
        return user_data


async def get_user(user_id: str) -> dict | None:
    """Get user data from Firestore."""
    doc = await get_db().collection("users").document(user_id).get()
    return doc.to_dict() if doc.exists else None


# ── Route handlers ────────────────────────────────────────────────


async def handle_google_login(request: Request):
    """Initiate Google OAuth flow."""
    redirect_uri = settings.google_redirect_uri
    return await oauth.google.authorize_redirect(request, redirect_uri)


async def handle_google_callback(request: Request):
    """Handle Google OAuth callback, create JWT, redirect to frontend."""
    token = await oauth.google.authorize_access_token(request)
    google_user = token.get("userinfo")
    if not google_user:
        return JSONResponse({"error": "Failed to get user info from Google"}, status_code=400)

    user_data = await upsert_user(google_user)
    session_id = str(uuid.uuid4())
    jwt_token = create_jwt(user_data["user_id"], session_id)

    response = RedirectResponse(url=settings.frontend_url)
    is_localhost = "localhost" in settings.frontend_url
    response.set_cookie(
        key="wa_token",
        value=jwt_token,
        httponly=True,
        secure=not is_localhost,
        samesite="lax",
        max_age=settings.jwt_expiry_hours * 3600,
    )
    logger.info("User logged in: %s (session %s)", user_data["email"], session_id)
    return response


async def handle_me(request: Request):
    """Return current user info from JWT cookie."""
    token = request.cookies.get("wa_token")
    if not token:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    payload = verify_jwt(token)
    if not payload:
        return JSONResponse({"error": "Invalid token"}, status_code=401)

    user_data = await get_user(payload["sub"])
    if not user_data:
        return JSONResponse({"error": "User not found"}, status_code=404)

    # Serialize datetime fields for JSON
    serializable = {}
    for k, v in user_data.items():
        if isinstance(v, datetime):
            serializable[k] = v.isoformat()
        else:
            serializable[k] = v

    return JSONResponse(serializable)


async def handle_logout(request: Request):
    """Clear auth cookie and redirect to website."""
    response = RedirectResponse(url=settings.frontend_url)
    response.delete_cookie("wa_token", path="/", domain=None)
    return response
