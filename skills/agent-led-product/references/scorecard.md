# Agent-Readiness Scorecard (10 questions)

Score each question **1** (fully true, with evidence), **0.5** (partial), or **0**. Cite a file path for every non-zero score. Total out of 10.

**Bands:** 0–3.5 **at risk** · 4–7.5 **transitioning** · 8–10 **agent-native**.

Why these ten: they are the properties the 2025-26 evidence shows platforms converging on (`evidence.md`):
- Salesforce Headless 360: everything as API, MCP tool or CLI command; agents metered per action.
- MCP / MCP Apps: tools plus UI inside agents.
- Sequoia: sell the work.
- Gartner cancellations: governance.

---

### Q1 — Can an agent do every core action through an API or MCP tool?
- **1:** MCP server (or complete versioned REST API) covering the product's core jobs end to end.
- **0.5:** MCP covers only part (e.g. reads only, or one side of a marketplace), or there is only a session-cookie internal API.
- **0:** Actions live only in UI handlers or server actions.
- **Detect:** `@modelcontextprotocol`, `McpServer`, `registerTool(`, `FastMCP`, `@mcp.tool`, tool objects with `inputSchema`; `/api/v1`; tRPC routers. Compare the tool list against the action inventory. Are the top 5 user jobs all covered?

### Q2 — Is there a CLI with machine-readable output?
- **1:** An installable CLI (`package.json` `bin`, Go/Rust binary, `typer`/`click` entry point) covering core actions, with `--json` or stable output, and the same key as the API.
- **0.5:** An admin or dev script, or a CLI that covers only login/list.
- **0:** None.
- **Why:** Salesforce lists CLI commands next to MCP tools as a first-class surface; coding agents operate through terminals (Claude Code, Codex, Copilot CLI, Antigravity, gws).

### Q3 — Are the docs agent-readable?
- **1:** At least two of: `llms.txt`; an OpenAPI spec; `/.well-known/mcp` (server card with tools + auth); a product SKILL.md / AGENTS.md agents can load; MCP server `instructions` that explain the workflow.
- **0.5:** One of those.
- **0:** Only human HTML docs or none.
- **Why:** Karpathy, "build for agents": Markdown docs, llms.txt, commands instead of "click here".

### Q4 — Can an agent authenticate without a browser, with scoped access?
- **1:** Hashed API keys or tokens, shown once, revocable, with scopes or a per-tool allowlist (or inherited role permissions). Header **and** URL-path forms, since some connectors only take a URL.
- **0.5:** Keys exist but are unscoped, a single static key, or created only by an admin script.
- **0:** Cookie sessions or OAuth redirects only.

### Q5 — Is pricing per action or outcome (not per seat)?
- **1:** Credits/usage ledger debited per action, or price per delivered outcome (per book, per verified play, per booked appointment), with billing wired up.
- **0.5:** Billing exists but is per seat or a flat subscription. Or usage is tracked but not billed.
- **0:** Free, or no billing code.
- **Why:** Salesforce Flex Credits per agent action. x402 pay-per-call (about 138M agent payments, Chainalysis Oct 2026). Seats shrink when agents do the work.

### Q6 — Does it own data a model can't recreate?
- **1:** It accumulates first-party records that usage improves: logs, telemetry, compliance records, learner progress, proof-of-play, user-created content plus history.
- **0.5:** Some private data, but thin or easily rebuilt.
- **0:** Wraps public data or none (a model with web search rebuilds it).
- **Test:** "If a frontier model had web search and our API docs, could it reproduce our dataset?" Oliver Wyman (Sep 2026): a data moat counts only if usage improves the product.

### Q7 — Does it sell a finished outcome, not just a tool?
- **1:** The customer gets the result (the ad made and played, the PR opened, the book written, the appointment booked).
- **0.5:** Mixed: a tool plus an optional done-for-you service, or the outcome exists but isn't how it's sold.
- **0:** A tool the customer must operate.
- **Why:** Sequoia: "A copilot sells the tool. An autopilot sells the work." The YC 2026 Requests for Startups asked for AI-native services.

### Q8 — Are agent actions audited and risky ones human-approved?
- **1:** Every tool call logged (actor, key, tool, sanitized args, result, duration), **and** risky actions (money, outbound messages, publish, delete, regulated records) go through an approval step before they take effect.
- **0.5:** One of the two, or only `confirm: true` flags (the agent confirms itself; that isn't a human).
- **0:** Neither.
- **Why:** MCP Apps requires explicit user approval for actions. Liability: "When an autopilot makes an error, the customer eats it" (N6 Finance). The Medvi cautionary tale.

### Q9 — Can its UI render inside the agents people use?
- **1:** MCP Apps `ui://` resources (or OpenAI Apps SDK templates / A2UI components) for the key moments (preview, pick, approve, chart).
- **0.5:** Tools return images or rich media, or there's a rich in-product chat, but nothing renders natively in Claude/ChatGPT/VS Code.
- **0:** Text only.
- **Why:** MCP Apps (Anthropic + OpenAI, Jan 26 2026) makes apps "pluggable components within agents". Google Generative UI and A2UI do the same.

### Q10 — Does a better model make it stronger, not obsolete?
- **1:** Better models make delivery cheaper or better while the moat (data, trust, distribution, regulated workflow, physical-world access) stays. E.g. SMS gateway (a model can't replace a SIM), proof-of-play networks, compliance systems.
- **0.5:** Mixed. The core gets commoditized but the method, data or workflow persists.
- **0:** A better model or an OS update ships this feature for free (thin wrappers, single-purpose AI utilities, "summarize my X").
- **Test:** "Next model release: do we celebrate or panic?"

---

## Scoring hygiene
- Re-add totals from the per-question values. Never trust a quoted total.
- Provisional scanner scores are hints. Signals in docs or helper scripts are not evidence.
- If evidence lives in another repo you can't see, say so and mark the score "provisional".
- Report the before/after delta whenever you re-score.
