"""TEMPLATE: MCP server for a FastAPI project (L3), using the official `mcp` Python SDK.

pip install "mcp>=1.10"   # FastMCP + Streamable HTTP

Mount in your existing FastAPI app so MCP shares auth, DB and services:

    from app.mcp_server import mcp, mcp_lifespan, McpKeyAuth
    app = FastAPI(lifespan=mcp_lifespan)
    app.mount("/api/mcp", McpKeyAuth(mcp.streamable_http_app()))

Tools call the SAME service functions as your REST routes (L1). Check the SDK
version's docs for the exact mount/lifespan pattern. It has changed across releases.
"""
from __future__ import annotations

import contextlib
import contextvars
import time
from typing import Literal

from mcp.server.fastmcp import FastMCP
from starlette.responses import JSONResponse

from app.api_keys import authenticate_key, Actor  # see api_keys.py
from app.services import items                   # ← your domain services
from app.services.activity import log_tool_call, request_approval

current_actor: contextvars.ContextVar[Actor | None] = contextvars.ContextVar("current_actor", default=None)

mcp = FastMCP(
    "myapp",
    instructions=(
        "MyApp does <one-line domain>. Workflow: get_overview → list_items → create_item → publish_item "
        "(publishing waits for the owner's approval). Tools accept names or ids. You act as the key's owner."
    ),
    stateless_http=True,
    json_response=True,
)


@contextlib.asynccontextmanager
async def mcp_lifespan(app):
    async with mcp.session_manager.run():
        yield


class McpKeyAuth:
    """ASGI wrapper: resolve Bearer key (or /api/mcp/<key>) → actor, else 401."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.inner(scope, receive, send)
        headers = {k.decode().lower(): v.decode() for k, v in scope.get("headers", [])}
        auth = headers.get("authorization", "")
        key = auth[7:].strip() if auth.startswith("Bearer ") else None
        actor = await authenticate_key(key) if key else None
        if not actor:
            res = JSONResponse({"jsonrpc": "2.0", "error": {"code": -32001, "message": "Missing or invalid API key."}, "id": None},
                               status_code=401, headers={"WWW-Authenticate": 'Bearer realm="myapp"'})
            return await res(scope, receive, send)
        token = current_actor.set(actor)
        try:
            await self.inner(scope, receive, send)
        finally:
            current_actor.reset(token)


def _actor() -> Actor:
    a = current_actor.get()
    if a is None:
        raise PermissionError("No actor")
    return a


def gated(need: str):
    """Permission check + audit log around every tool. (FastMCP lists all tools; we refuse at call time.
    For per-key tool LISTS, build the FastMCP instance per request or filter via a custom list_tools handler.)"""
    def wrap(fn):
        async def inner(**kwargs):
            a = _actor()
            t0 = time.monotonic()
            if not a.can(need):
                return f"Your key can't do this (needs '{need}'). Ask the account owner to grant it."
            try:
                out = await fn(**kwargs)
                await log_tool_call(a, fn.__name__, kwargs, ok=True, ms=int((time.monotonic() - t0) * 1000))
                return out
            except Exception as e:  # readable error back to the agent
                await log_tool_call(a, fn.__name__, kwargs, ok=False, error=str(e), ms=int((time.monotonic() - t0) * 1000))
                return f"Something went wrong: {e}"
        inner.__name__, inner.__doc__ = fn.__name__, fn.__doc__
        inner.__annotations__ = fn.__annotations__
        return inner
    return wrap


@mcp.tool()
@gated("reports.view")
async def get_overview() -> dict:
    """Today at a glance: counts, recent activity, what needs attention. Start here."""
    return await items.overview(_actor().owner_id)


@mcp.tool()
@gated("items.view")
async def list_items(q: str | None = None, status: Literal["draft", "live", "archived"] | None = None, cursor: str | None = None) -> dict:
    """Items with status, ids and preview links. Filter by text or status."""
    return await items.list(_actor().owner_id, q=q, status=status, cursor=cursor)


@mcp.tool()
@gated("items.edit")
async def create_item(name: str, body: str, idempotency_key: str | None = None) -> dict:
    """Create a DRAFT item. Nothing goes live until publish_item is approved."""
    return await items.create_draft(_actor().owner_id, name=name, body=body, idempotency_key=idempotency_key)


@mcp.tool()
@gated("items.publish")
async def publish_item(item: str, dry_run: bool = False) -> dict:
    """Ask the owner to approve publishing (class B). Use dry_run to see the cost first."""
    a = _actor()
    it = await items.resolve(a.owner_id, item)
    if dry_run:
        return {"would_publish": it["name"], "cost": items.price("publish")}
    pending = await request_approval(a, tool="publish_item", args={"id": it["id"]}, summary=f'Publish "{it["name"]}"',
                                     cost=items.price("publish"))
    return {"status": "waiting_for_approval", "ref": pending["id"], "approve_url": pending["url"]}
