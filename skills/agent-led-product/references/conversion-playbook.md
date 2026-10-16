# Conversion playbook: layers L1–L9

Ship each layer on its own, verify it, then move on. Match the project's stack, conventions, data layer and auth. Templates in `templates/` are starting points: **adapt, don't paste**.

**Before starting:** read the project's CLAUDE.md, AGENTS.md and README; run its tests, typecheck and build to get a baseline; look for an existing in-house implementation to copy. If the user has other repos with a working MCP and keys, mirror those patterns.

---

## L1: Service layer (domain actions)
**Goal:** UI, REST, MCP and CLI all call the same functions.
- Move business logic out of route handlers, server actions and components into `server/services/<domain>.ts` (or `app/services/*.py`). Functions take plain inputs plus an **actor/access context** and return `{ ok, data } | { error }`.
- Keep permission checks inside services (`can(access, "ads.publish")`) so every surface inherits them.
- **Accept:** the existing UI still works (tests/build pass); each top job is one service call.

## L2: Scoped API keys
- Key format `<app>_<base64url 24 bytes>`. Store a **SHA-256 hash** plus the first 12 chars as `prefix`. Show the key once.
- Fields: `name`, `hash`, `prefix`, `userId`/`orgId`, `scopes[]` or `allowedTools[]` (or inherit the creator's role permissions), `createdAt`, `lastUsedAt`, `expiresAt?`, `revokedAt?`.
- UI: Settings → "AI assistant" → create, copy, revoke, last used. **Creating keys is a human-only action (class C).**
- Accept `Authorization: Bearer` **and** a key in the URL path (for URL-only connectors).
- **Accept:** a revoked key returns 401; a key can't exceed its owner's permissions; keys never appear in logs.
- Template: `templates/nextjs/api-keys.ts` · `templates/fastapi/api_keys.py`.

## L3: MCP server
- Stateless Streamable HTTP at `/api/mcp` (+ `/api/mcp/[key]`). Fresh `McpServer` per request.
- Register tools only if the key's access allows them (wrap `registerTool`).
- Server `instructions` explain the workflow and that the agent acts as the key's owner.
- Tools follow `tool-design.md`. Start with the **top 5 jobs**, then reach coverage of all A/B actions in the action map.
- Python: the official `mcp` SDK `FastMCP` with `streamable_http_app()` mounted in FastAPI, or `fastapi-mcp` if the project already uses it.
- **Accept:** `scripts/mcp_smoke.mjs` passes; a fresh agent completes the top 3 jobs using only the tools.
- Templates: `templates/nextjs/mcp-route.ts`, `mcp-server.ts` · `templates/fastapi/mcp_server.py`.

## L4: Audit log and approvals
- **Log every tool call**: actor, keyPrefix, tool, sanitized args summary (truncate, redact secrets/PII), success/error, durationMs, ip/userAgent, requestId. Show it on an admin page and through a `list_activity` tool.
- **Approvals for class-B actions**: the tool creates a `PendingAction {tool, args, actor, summary, cost, status: pending}` and returns "Waiting for approval from <owner> (ref …)". The owner approves in-app or via a phone notification; an MCP Apps card can *show* the request and link to the approval page. Then the service executes and the result is logged. Give pending actions an expiry.
- **Never expose an `approve_action` tool to the same key that requested the action.** The server can't tell a human click from the agent approving itself. Approval must come from a human-authenticated surface (web session, signed phone link, or a separate owner device).
- **Accept:** a B-class tool never changes state before approval; every call appears in the log.
- Template: `templates/nextjs/audit-and-approvals.ts`.

## L5: Agent-readable docs
- `/llms.txt`: what the product does, the MCP URL, auth, top jobs with example prompts, tool list, links to Markdown docs.
- `/.well-known/mcp`: JSON server card listing endpoint, transport, auth, scopes and tools.
- OpenAPI for REST (FastAPI gives it free; Next.js: zod-to-openapi or a hand-written spec).
- A product **SKILL.md** users can drop into `~/.claude/skills` or another agent's skills folder, with the workflow, the tool order and the gotchas.
- **Accept:** a fresh agent given only `llms.txt` can connect and do job #1.
- Templates: `templates/docs/llms.txt`, `templates/docs/PRODUCT-SKILL.md`, `templates/nextjs/well-known-and-llms.ts`.

## L6: CLI
- `<app> <noun> <verb> [args] [--json]`. Auth via `<app> key <key>` stored in `~/.config/<app>/config.json` (0600), or via the `<APP>_TOKEN` env var.
- Simplest robust design: the CLI **calls the MCP endpoint** (`tools/call`), so there's one source of truth. Generate commands from `tools/list`.
- Ship via `npm i -g`, a curl install script, or a single-file binary.
- **Accept:** `app --help` lists the top jobs; `--json` output is stable; no interactive prompts in non-TTY.
- Template: `templates/cli/cli.mjs`.

## L7: Per-action / per-outcome pricing
- Pick the unit with `pricing-models.md`. Implement wallet + append-only ledger, debiting on success with an idempotency key.
- Add a `get_pricing` tool. Tool outputs say "cost: N credits, balance: M". `dryRun` returns the cost.
- Billing: Stripe Checkout for credit packs or subscription grants; Stripe meter events for usage-based plans; x402 for pay-per-call tools sold to outside agents.
- **Accept:** a double-submitted call charges once; a failed action charges nothing; the user can see the ledger.
- Template: `templates/nextjs/credits.ts`.

## L8: Need-based UI (MCP Apps)
- Pick the 1–3 **class-D moments** (preview, compare, approve, chart). Build each as a small self-contained HTML card (inline CSS/JS, no external fetches unless declared).
- Register a `ui://<app>/<card>` resource with MIME type `text/html;profile=mcp-app`, and link it from the tool's `_meta.ui.resourceUri`. The official helpers in `@modelcontextprotocol/ext-apps` (`registerAppTool`, `registerAppResource`) do this. **Check the current spec/SDK version before shipping**; the extension is new (Jan 2026).
- Always return a text fallback in `content` for clients without MCP Apps.
- The card talks back via the host bridge (postMessage JSON-RPC): it can request tool calls for safe A-class actions, and opens links (`ui/open-link`) for approvals so the human decides in their own session.
- **Accept:** the card renders in Claude and ChatGPT (or MCP Inspector), and the text fallback works elsewhere.
- Template: `templates/nextjs/mcp-app-card.ts`.

## L9: Distribution
- **In-app:** a Settings → "Use with AI" page with a copy-paste connector URL, `claude mcp add …` and Cursor/VS Code JSON snippets, the product SKILL.md download, and example prompts.
- **Directories:** the official MCP Registry, plus the client directories (Claude connectors, ChatGPT apps) where eligible. For pay-per-call tools, x402 marketplaces/bazaars.
- **Positioning:** "Use <product> from Claude/ChatGPT". Lead with the outcome, not "we have MCP".
- **Accept:** a new user goes from the landing page to their first successful agent action in under 5 minutes.

---

## After converting: Mode 5 (verify)
1. `node scripts/mcp_smoke.mjs https://app/api/mcp --key-env APP_KEY`
2. Fresh-agent task test on the top 3 jobs: log stalls, then fix tool design.
3. Re-score with the scorecard; report the before → after delta.
