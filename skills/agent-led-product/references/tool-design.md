# Designing tools agents use well

An agent sees only names, descriptions and schemas. **The tool list is the UI.**

## Naming and shape
- `verb_noun`, snake_case, stable: `list_ads`, `get_ad`, `create_ad`, `publish_ad`, `ad_report`. One job per tool. Avoid `manage_ads(action=...)`.
- Group with a shared noun so related tools sit together. 10–60 tools is fine. Beyond about 60, use **progressive disclosure**: a few generic tools (`search_actions`, `describe_action`, `run_action`) or toolsets enabled by scope. Microsoft Work IQ exposes "10 generic tools with progressive disclosure".
- Server `instructions`: 3–6 sentences covering the domain, the recommended workflow ("read X, then Y, check with Z"), how ids work, and "you act as <user> with their access". Agents follow this.

## Inputs
- Small, typed (zod / pydantic) inputs with `.describe()` on every field. Prefer enums over free text. Give defaults (`range: "7d"`).
- **Accept names or ids** (`screen: "Lobby TV"` or an id). Resolve server-side and return a readable error on ambiguity: "2 screens match 'Lobby': Lobby TV (id…), Lobby Kiosk (id…)".
- Paths for hierarchies (`folder: "Clients/Joe's Coffee"`), created on demand.
- Never require the agent to construct HTML/SQL/regex unless that is the product (and then ship a guide tool: `get_ad_guide`).

## Outputs
- Return what the next step needs: ids, names, URLs (preview/share links), status, and the **next suggested tool** when useful.
- Compact JSON or short Markdown. Cap list sizes, paginate with `cursor`, and summarise ("37 more, use cursor").
- Images: return `{type: "image"}` content for previews. For decisions, return an MCP Apps `ui://` card **plus** a text fallback.
- Never return secrets, raw tokens, other tenants' data or full PII dumps.

## Errors
- Expected failures → `isError: true` with a human sentence and a fix: "Screen 'Lobby' is offline since 14:02; call screen_command with 'reboot' or pick another screen."
- Unexpected → log server-side with a request id; return "Something went wrong (ref abc123)".

## Safety controls
- **Permission gating at registration:** tools the key can't use are not listed (pattern: `TOOL_ACCESS[name]` + `can(access, need)`, wrapping `registerTool`).
- Destructive tools: `confirm: z.literal(true)` **and**, for B-class actions, a **pending approval** (see `agentify-decision.md`).
- `dryRun: true` on bulk or expensive tools returns what *would* happen and the credit cost.
- Idempotency: accept `idempotencyKey` on create/charge/send. Re-sends must not double-charge or double-send.
- Rate limits per key. Usage logged per call.

## Transport and auth (remote MCP)
- Stateless **Streamable HTTP** at `/api/mcp`: fresh server per request, `sessionIdGenerator: undefined`, `enableJsonResponse: true`. Scales like any route.
- Key via `Authorization: Bearer <key>` **or** `/api/mcp/<key>` for connectors that take only a URL (claude.ai, ChatGPT, Claude Desktop custom connectors).
- 401 with `WWW-Authenticate: Bearer realm="<app>"` when the key is missing or invalid.
- Publish `/.well-known/mcp` listing the endpoint, auth, scopes and tool names.

## Test like an agent
Give a fresh agent only the tool list plus llms.txt and the top 3 jobs. Every stall, wrong tool or extra round-trip is a naming, description or shape bug. Fix it, then re-test.
