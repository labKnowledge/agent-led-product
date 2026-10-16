"""TEMPLATE: scoped API keys for agents (L2), FastAPI flavour. Adapt the storage calls to your DB.

Rules: SHA-256 hash only · shown once · prefix · revocable · last_used_at ·
scopes ∩ owner's current permissions · creating keys is HUMAN-ONLY (never a tool).
"""
from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone

APP = "myapp"


def _sha(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


@dataclass
class Actor:
    key_id: str
    key_prefix: str
    key_name: str
    owner_id: str
    scopes: list[str] = field(default_factory=list)
    owner_permissions: set[str] = field(default_factory=set)

    def can(self, need: str) -> bool:
        if need not in self.owner_permissions:
            return False
        return not self.scopes or need in self.scopes


async def create_api_key(db, owner_id: str, name: str, scopes: list[str] | None = None) -> str:
    key = f"{APP}_{secrets.token_urlsafe(24)}"
    await db.api_keys.insert_one({
        "name": (name or "AI assistant").strip()[:60],
        "hash": _sha(key),
        "prefix": key[:12],
        "owner_id": owner_id,
        "scopes": scopes or [],
        "created_at": datetime.now(timezone.utc),
        "last_used_at": None,
        "revoked_at": None,
    })
    return key  # show once; never log


async def authenticate_key(key: str | None, db=None) -> Actor | None:
    if not key or not key.startswith(f"{APP}_"):
        return None
    db = db or get_db()  # noqa: F821 — wire to your DB accessor
    rec = await db.api_keys.find_one_and_update(
        {"hash": _sha(key), "revoked_at": None},
        {"$set": {"last_used_at": datetime.now(timezone.utc)}},
    )
    if not rec:
        return None
    perms = await permissions_for(rec["owner_id"])  # noqa: F821 — owner's CURRENT permissions
    return Actor(str(rec["_id"]), rec["prefix"], rec["name"], rec["owner_id"], rec.get("scopes", []), perms)
