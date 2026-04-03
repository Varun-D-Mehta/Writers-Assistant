"""Fly.io Machines session manager: create, track, and reap worker instances."""

import asyncio
import logging
import time
from dataclasses import dataclass, field

import httpx

from config import settings

logger = logging.getLogger(__name__)

FLY_API_BASE = "https://api.machines.dev/v1"


@dataclass
class Session:
    """Tracks an active user session and its Fly Machine."""
    user_id: str
    session_id: str
    machine_id: str
    private_ip: str
    created_at: float = field(default_factory=time.time)
    last_active: float = field(default_factory=time.time)


class SessionManager:
    """Manages the lifecycle of per-user Fly Machines."""

    def __init__(self):
        self.sessions: dict[str, Session] = {}  # session_id -> Session
        self.user_sessions: dict[str, list[str]] = {}  # user_id -> [session_ids]
        self._client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {settings.fly_api_token}"},
            timeout=30.0,
        )

    async def get_or_create_session(self, user_id: str, session_id: str) -> Session:
        """Get an existing session or create a new Fly Machine for it."""
        if session_id in self.sessions:
            session = self.sessions[session_id]
            session.last_active = time.time()
            return session

        # Check max sessions per user
        user_sids = self.user_sessions.get(user_id, [])
        if len(user_sids) >= settings.max_sessions_per_user:
            # Stop oldest session
            oldest_sid = user_sids[0]
            await self.destroy_session(oldest_sid)

        # Create a new Fly Machine
        machine = await self._create_machine(user_id, session_id)
        session = Session(
            user_id=user_id,
            session_id=session_id,
            machine_id=machine["id"],
            private_ip=machine["private_ip"],
        )
        self.sessions[session_id] = session
        self.user_sessions.setdefault(user_id, []).append(session_id)

        logger.info("Session created: %s (machine %s) for user %s",
                     session_id, machine["id"], user_id)
        return session

    async def destroy_session(self, session_id: str) -> None:
        """Stop and destroy a Fly Machine for a session."""
        session = self.sessions.pop(session_id, None)
        if not session:
            return

        # Remove from user's session list
        user_sids = self.user_sessions.get(session.user_id, [])
        if session_id in user_sids:
            user_sids.remove(session_id)

        try:
            await self._stop_machine(session.machine_id)
            await self._destroy_machine(session.machine_id)
            logger.info("Session destroyed: %s (machine %s)", session_id, session.machine_id)
        except Exception as e:
            logger.error("Failed to destroy machine %s: %s", session.machine_id, e)

    async def destroy_user_sessions(self, user_id: str) -> None:
        """Destroy all sessions for a user (on logout)."""
        session_ids = list(self.user_sessions.get(user_id, []))
        for sid in session_ids:
            await self.destroy_session(sid)

    async def touch_session(self, session_id: str) -> None:
        """Update the last_active timestamp for a session."""
        if session_id in self.sessions:
            self.sessions[session_id].last_active = time.time()

    async def reap_idle_sessions(self) -> None:
        """Stop machines that have been idle longer than the timeout."""
        cutoff = time.time() - (settings.idle_timeout_minutes * 60)
        idle_sessions = [
            sid for sid, s in self.sessions.items()
            if s.last_active < cutoff
        ]
        for sid in idle_sessions:
            logger.info("Reaping idle session: %s", sid)
            await self.destroy_session(sid)

    # ── Fly Machines API ──────────────────────────────────────────

    async def _create_machine(self, user_id: str, session_id: str) -> dict:
        """Create a new Fly Machine for a worker session."""
        url = f"{FLY_API_BASE}/apps/{settings.fly_app_name}/machines"
        body = {
            "name": f"wa-{session_id[:8]}",
            "region": settings.fly_region,
            "config": {
                "image": settings.fly_worker_image,
                "env": {
                    "DATA_DIR": "/app/data",
                },
                "guest": {
                    "cpu_kind": "shared",
                    "cpus": 1,
                    "memory_mb": 256,
                },
                "services": [
                    {
                        "ports": [{"port": 8000}],
                        "protocol": "tcp",
                        "internal_port": 8000,
                    }
                ],
            },
            "metadata": {
                "user_id": user_id,
                "session_id": session_id,
            },
        }
        resp = await self._client.post(url, json=body)
        resp.raise_for_status()
        machine = resp.json()

        # Wait for machine to be ready
        await self._wait_for_machine(machine["id"])

        return {
            "id": machine["id"],
            "private_ip": machine.get("private_ip", f"{machine['id']}.vm.{settings.fly_app_name}.internal"),
        }

    async def _wait_for_machine(self, machine_id: str, timeout: int = 30) -> None:
        """Wait until a machine reaches the 'started' state."""
        url = f"{FLY_API_BASE}/apps/{settings.fly_app_name}/machines/{machine_id}/wait"
        try:
            resp = await self._client.get(url, params={"state": "started", "timeout": timeout})
            resp.raise_for_status()
        except Exception as e:
            logger.warning("Machine wait timed out for %s: %s", machine_id, e)

    async def _stop_machine(self, machine_id: str) -> None:
        """Stop a Fly Machine."""
        url = f"{FLY_API_BASE}/apps/{settings.fly_app_name}/machines/{machine_id}/stop"
        resp = await self._client.post(url)
        resp.raise_for_status()

    async def _destroy_machine(self, machine_id: str) -> None:
        """Destroy (delete) a Fly Machine."""
        url = f"{FLY_API_BASE}/apps/{settings.fly_app_name}/machines/{machine_id}"
        resp = await self._client.delete(url, params={"force": "true"})
        resp.raise_for_status()


# Singleton instance
manager = SessionManager()


async def idle_reaper_loop():
    """Background task that reaps idle sessions periodically."""
    while True:
        await asyncio.sleep(60)
        try:
            await manager.reap_idle_sessions()
        except Exception as e:
            logger.error("Idle reaper error: %s", e)
