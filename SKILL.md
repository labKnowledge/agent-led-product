---
name: agent-led-product
description: Analyze, score, and convert any software project into an agent-led product — one AI agents can operate (API/MCP, CLI, agent docs, scoped keys), that charges per action or outcome, gates risky agent actions behind human approval, and shows need-based UI inside the agents people already use (MCP Apps / A2UI). Use when the user asks to "score my app for agents", "is this agent-ready", "agent-readiness audit", "make this agentic", "turn this into an agent-led product", "add MCP to my app", "headless / API-first", "what should be agentic and what shouldn't", "how will users use this through Claude/ChatGPT", "pivot for the agent era", "audit my portfolio / all my apps", "per-action pricing", "MCP Apps / ui:// card", "llms.txt", or "what should I build in 2026". Works on a single repo, a whole folder of projects, or just an idea. Grounded in the 2025-2026 evidence (Salesforce Headless 360, MCP + MCP Apps, Google Generative UI/A2UI, Claude Code/Codex/Copilot CLI, Sequoia "sell the work").
metadata:
  version: 1.1.0
  origin: "Builder's Field Guide research (Oct 2026)"
  author: labKnowledge
  license: MIT
---

# Agent-Led Product

Turn any project into a product **AI agents can operate**, **that earns per action or outcome**, and **that people can use from inside the agents they already use**. Do the hard work yourself: the inventory, the judgment calls, and the plumbing. Hand the user a short report and code that works.

**The premise (evidence in `references/evidence.md`):** agents are becoming the main users of software. Salesforce shipped "No Browser Required" (Apr 2026). Anthropic and OpenAI co-built MCP Apps (Jan 2026), so a UI is now a component *inside* the agent. Building code is close to free (Cursor, Lovable, Base44). So the value moves to **trusted actions, proprietary data, finished outcomes, and distribution**. That is what this skill builds toward.

## Pick the mode from the request (don't ask unless it's truly ambiguous)

| User says… | Mode | Output |
|---|---|---|
| "score / audit / is it agent-ready / how do we stand" | **1. AUDIT** | Scorecard + report |
| "what should be agentic / what not / how would users use it" | **2. AGENTIFY PLAN** | Action map + user journeys + roadmap |
| "make it agentic / convert / add MCP / implement" | **3. CONVERT** (runs 1+2 first if not done) | Working code, layer by layer, verified |
| "all my apps / this folder of projects / portfolio" | **4. PORTFOLIO** | Ranked scoreboard, double-down / merge / retire |
| "check it works / re-score / test the MCP" | **5. VERIFY** | Smoke test + agent task test + new score |
| "what should I build / pivot / new idea" | **6. STRATEGY** | Five-bets fit, what not to build, pivot path |
| "pricing / per-action / credits" · "launch / directories" · "agent docs / llms.txt" · "ui card" | **7. TARGETED** | That one layer from the playbook |

Default when the request is vague ("make my project agent-led"): **AUDIT → AGENTIFY PLAN → ask one go/no-go → CONVERT**. Explain this flow to the user in one line.

---

## Mode 1: AUDIT (score a project)

1. **Scan** (fast and deterministic):
   ```bash
   python3 -I <skill>/scripts/scan.py <project_dir> --out /tmp/alp-scan.json --md
   ```
   It detects MCP servers and their tool count, CLIs, API routes (Next.js, Express, Fastify, Hono, FastAPI, Flask, Go, tRPC), keys and scopes, OpenAPI/llms.txt/SKILL.md, billing, audit logs, approvals, LLM use and MCP Apps. It also produces an **action inventory** (every route/server action/tool) and a **provisional score**.
2. **Read the code to confirm.** Signals are hints, not verdicts. For each of the 10 questions, open the files the scan points to and decide 0 / 0.5 / 1 with a file-path citation. Rubric and how to detect each one: `references/scorecard.md`.
3. **Judge Q6, Q7 and Q10** (data moat, outcome vs tool, model resilience). These need reasoning, not grep. Use the tests in the scorecard reference.
4. **Write the report** using `references/report-template.md` to `docs/agent-led/AUDIT.md` in the project, unless the project keeps docs elsewhere. Include the score table, the band, the top 3 gaps, the single highest-leverage move, and every citation.
5. **Re-add the totals yourself** from the per-question values before reporting. Subagents and quick sums miscount.

Bands: **0–3.5 at risk · 4–7.5 transitioning · 8–10 agent-native.**

## Mode 2: AGENTIFY PLAN (what to agentify, what not, how users will do it)

1. Start from the action inventory (scan + your reading). Group routes and features into **user-meaningful actions** ("publish an ad", "close the month"), not endpoints.
2. **Classify every action** with the decision matrix in `references/agentify-decision.md`. It weighs reversibility, blast radius, regulation, judgment and frequency:
   - **Agent-autonomous**: reads, drafts, idempotent and reversible changes
   - **Agent + human approval**: money, outbound messages, publishing, deletes, regulated records
   - **Human-only**: legal sign-off, identity, credentials, safety-critical, taste
   - **Generated UI (ui:// card)**: where a person must see, pick or decide (previews, comparisons, forms)
   - **Keep a fixed screen**: high-frequency routine work with muscle memory, plus audit/review dashboards
3. **Write the user journeys**: how a real user does the top 3–5 jobs through Claude/ChatGPT/Gemini/Cursor/the CLI. Cover the exact first-run steps (get key → add connector → first prompt), what they see, and where approval interrupts. Template in `references/agentify-decision.md`.
4. **Pricing move**: from seats to per-action or per-outcome. See `references/pricing-models.md`.
5. **Roadmap**: order the conversion layers (Mode 3) by leverage for *this* product. Estimate effort per layer.
6. Write it to `docs/agent-led/PLAN.md`. Put the **action map table** first. Users scan tables.

## Mode 3: CONVERT (make it agent-led)

Follow `references/conversion-playbook.md`, layer by layer. **Each layer ships independently and gets verified before the next.**
Match the project's own stack, naming, auth and data layer. Adapt templates, don't paste them.

| Layer | What | Template |
|---|---|---|
| L1 | **Domain actions as a service layer.** Pull logic out of UI handlers so UI, REST, MCP and CLI all call the same functions | — (refactor) |
| L2 | **Scoped API keys**: hashed, prefix-shown-once, scopes or per-tool allowlist, revocable, `lastUsedAt` | `templates/nextjs/api-keys.ts`, `templates/fastapi/api_keys.py` |
| L3 | **MCP server**: stateless Streamable HTTP, tools gated by the key's scopes, server `instructions`, key in header *or* URL path | `templates/nextjs/mcp-*.ts`, `templates/fastapi/mcp_server.py` |
| L4 | **Audit log of every tool call** + **approval queue** for risky actions (`pending → approved/denied → executed`) | `templates/nextjs/audit-and-approvals.ts` |
| L5 | **Agent-readable docs**: `llms.txt`, `/.well-known/mcp`, OpenAPI, a product SKILL.md agents can load | `templates/docs/*`, `templates/nextjs/well-known-and-llms.ts` |
| L6 | **CLI**: one-shot commands, `--json` output, same key, same actions | `templates/cli/cli.mjs` |
| L7 | **Per-action / per-outcome pricing**: credits wallet + append-only ledger, debit on success only | `templates/nextjs/credits.ts` |
| L8 | **Need-based UI**: MCP Apps `ui://` cards for the 1–3 moments a person must see or decide | `templates/nextjs/mcp-app-card.ts` |
| L9 | **Distribution**: connector instructions in the app's Settings, directory listings, launch | `references/conversion-playbook.md#l9` |

Rules while converting:
- **Tool design matters more than tool count.** Follow `references/tool-design.md`: verbs plus nouns, names or ids accepted, small typed inputs, readable errors, `confirm`/`dryRun` on destructive tools, progressive disclosure for large APIs.
- **Never widen access.** A key acts with its creator's permissions. Tools beyond them are not even listed.
- **Secrets never reach the model.** No keys in tool output; sanitize argument summaries in logs.
- Run the project's own tests, typecheck and build after each layer. Then run **Mode 5** on the result.
- Commit or push only when the user asks.

## Mode 4: PORTFOLIO (many projects)

1. `python3 -I <skill>/scripts/scan.py <parent_dir> --portfolio --out /tmp/alp-portfolio.json --md` gives one row per project.
2. For more than 8 projects, **fan out read-only subagents** (groups of 7–13 projects). Give each the 10 questions verbatim and require file-path evidence. Then **re-add every total yourself**.
3. Chart: `python3 <skill>/scripts/chart.py /tmp/alp-scores.json <out_dir>` (needs matplotlib; `pip install matplotlib` if missing), which outputs a scoreboard plus a per-question coverage chart.
4. Recommend, with criteria from `references/portfolio.md`:
   - **double down** (high score + outcome + data)
   - **quick wins** (keys already exist → add MCP)
   - **shared kit** (fix portfolio-wide gaps once)
   - **merge/retire** (duplicates, obsolete, no moat)
   - **monetise** (free products with an outcome)
5. Report with a ranked scoreboard, the bet mapping, and a 0/30/60/90-day action plan with checkboxes.

## Mode 5: VERIFY

- **MCP smoke test**: `node <skill>/scripts/mcp_smoke.mjs <mcp_url> [--key-env VAR]`. It runs initialize, then tools/list, and checks every tool has a description and input schema. It also confirms unauthenticated calls get 401.
- **Agent task test**: give a fresh agent (subagent) only the MCP or CLI plus `llms.txt`. Ask it to complete the top 3 user jobs from the plan. Record where it got stuck. Each stall is a tool-design bug.
- **Re-score** with Mode 1 and show the before/after delta.

## Mode 6: STRATEGY (what to build / pivot)

Use `references/evidence.md` (the five bets ranked by evidence, what not to build, the skeptics) to judge an idea or existing product:
- Which bet it fits
- What makes it defensible when code is free
- How it gets paid (per outcome/action)
- Its main risk
- **The pivot moves**, each tied to a dated, sourced piece of evidence

Be honest when the evidence says "don't build this".

---

## Non-negotiables

- **Evidence only.** Cite file paths for every score and dated sources for every market claim. Label vendor or aggregator stats as estimates. Never invent quotes. `references/evidence.md` lists verified quotes and the ones known to be fabricated.
- **Agentify the actions, not the screens.** Agents need actions. People need the 1–3 moments where they must see or decide.
- **Every risky action has a human gate and an audit trail** before it's exposed to agents. Gartner (as cited) expects >40% of agentic projects to be cancelled by 2027, largely over governance and cost.
- **Do the work, don't hand over homework.** Inferred defaults over questions. One clear next step per report.
- **Reports go in the project** (`docs/agent-led/`), not into chat. Chat gets the verdict, the score, and the one next move.

## Files

- `references/scorecard.md`: the 10 questions, detection signals, 0/0.5/1 rubric, bands
- `references/agentify-decision.md`: classify every action; user-journey template
- `references/conversion-playbook.md`: layers L1–L9 with acceptance checks
- `references/tool-design.md`: how to design tools agents use well
- `references/pricing-models.md`: seat → action → outcome; credits ledger rules
- `references/portfolio.md`: double-down / merge / retire criteria, shared-kit pattern
- `references/evidence.md`: 2025-2026 market evidence, verified quotes, five bets, what not to build
- `references/report-template.md`: AUDIT.md / PLAN.md skeletons
- `scripts/scan.py`: signals + action inventory + provisional score (single repo or portfolio)
- `scripts/mcp_smoke.mjs`: MCP endpoint smoke test
- `scripts/chart.py`: scoreboard + coverage charts from a scores JSON
- `templates/`: Next.js/TypeScript, FastAPI/Python, CLI and docs starting points
