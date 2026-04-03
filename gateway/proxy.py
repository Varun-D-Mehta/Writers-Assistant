"""Reverse proxy: validates auth, checks subscription, forwards to worker machines."""

import logging

import httpx
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse

from auth import verify_jwt
from session_manager import manager
from subscription import subscription_middleware

logger = logging.getLogger(__name__)

# Persistent HTTP client for proxying to workers
_proxy_client = httpx.AsyncClient(timeout=120.0)


async def proxy_request(request: Request):
    """Validate JWT, check subscription, and proxy the request to the user's worker machine."""

    # 1. Authenticate
    token = request.cookies.get("wa_token")
    if not token:
        return JSONResponse({"error": "Not authenticated"}, status_code=401)

    payload = verify_jwt(token)
    if not payload:
        return JSONResponse({"error": "Invalid token"}, status_code=401)

    user_id = payload["sub"]
    session_id = payload["sid"]

    # 2. Check subscription
    denied = await subscription_middleware(request, user_id)
    if denied:
        return denied

    # 3. Get or create worker machine
    try:
        session = await manager.get_or_create_session(user_id, session_id)
    except Exception as e:
        logger.error("Failed to get/create session for %s: %s", user_id, e)
        return JSONResponse(
            {"error": "Failed to start your writing session. Please try again."},
            status_code=503,
        )

    # 4. Proxy the request to the worker
    worker_url = f"http://{session.private_ip}:8000{request.url.path}"
    if request.url.query:
        worker_url += f"?{request.url.query}"

    # Forward headers (except host and cookie — worker doesn't need auth)
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("cookie", None)

    body = await request.body()

    try:
        if _is_streaming_request(request):
            # SSE streaming — forward as a stream
            worker_req = _proxy_client.build_request(
                method=request.method,
                url=worker_url,
                headers=headers,
                content=body,
            )
            worker_resp = await _proxy_client.send(worker_req, stream=True)
            return StreamingResponse(
                worker_resp.aiter_bytes(),
                status_code=worker_resp.status_code,
                headers=dict(worker_resp.headers),
                media_type=worker_resp.headers.get("content-type"),
            )
        else:
            resp = await _proxy_client.request(
                method=request.method,
                url=worker_url,
                headers=headers,
                content=body,
            )
            return StreamingResponse(
                iter([resp.content]),
                status_code=resp.status_code,
                headers=dict(resp.headers),
            )
    except httpx.ConnectError:
        logger.error("Worker unreachable for session %s (machine %s)",
                      session.session_id, session.machine_id)
        return JSONResponse(
            {"error": "Your writing session is starting up. Please retry in a moment."},
            status_code=503,
        )
    except Exception as e:
        logger.error("Proxy error for session %s: %s", session.session_id, e)
        return JSONResponse({"error": "Internal proxy error"}, status_code=502)


def _is_streaming_request(request: Request) -> bool:
    """Detect if this request expects a streaming response (SSE)."""
    accept = request.headers.get("accept", "")
    return "text/event-stream" in accept
