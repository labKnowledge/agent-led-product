# What to agentify — and what not to

Agentify **actions**, not screens. People keep **the moments where they must see, choose or sign off**. Everything else becomes something an agent can do for them.

## Step 1 — Build the action map
Turn the inventory (routes, server actions, tools, CLI commands) into **user-meaningful actions**: verb + object, the way a customer would say it ("publish this ad to the lobby screens", "close March's books"). Merge CRUD endpoints that serve one job. Drop plumbing (auth callbacks, webhooks, health checks).

For each action record: **who does it today · how often · what it changes · can it be undone · who is affected if it's wrong · is it regulated · does it need taste or judgment.**

## Step 2 — Classify each action

| Class | Rule of thumb | Examples | How it ships |
|---|---|---|---|
| **A. Agent-autonomous** | Read-only, drafts, or reversible changes inside the user's own space; low blast radius | list/search/get, reports, draft a post, create in "draft", tag/organize, preview | MCP tool + CLI command, no gate |
| **B. Agent + human approval** | Money moves, anything leaves the system (email/SMS/publish/go live), deletes, bulk changes, other people's records, regulated data | publish_ad, send_message, refund, delete_*, submit_application, change_permissions | Tool creates a **pending action**. A human approves (in-app or phone; an MCP Apps card can show it and link to the approval page), then it executes. Logged |
| **C. Human-only** | Legal or identity acts, credential and key management, safety-critical, final creative or medical/legal judgment | sign contract, create API keys, set payout bank, clinical sign-off | Not exposed as tools. Agent can *prepare* and *link* to the screen |
| **D. Generated UI moment** | The person must *see* or *pick*: previews, comparisons, maps, charts, forms with many fields, approvals | ad preview, chapter scorecard, plan comparison, approval card | MCP Apps `ui://` card returned by the tool (plus a text fallback) |
| **E. Keep a fixed screen** | High-frequency routine work with muscle memory; audit and review dashboards; first-run onboarding | daily check-in kiosk, cashier flow, the admin audit view | Keep the GUI, but back it with the same service layer |

**Tie-breakers**
- If in doubt between A and B, choose **B** and make approval one tap. Loosen later using real data from the audit log.
- Regulated domains (health, finance, childcare, legal): default to **B** for any write, **C** for sign-offs. Compliance is part of the product (Medvi: FDA warning letter Feb 2026).
- Frequency × risk: a high-frequency, low-risk action that is gated becomes friction. Make it A with undo.
- Never expose: raw SQL, arbitrary shell, credential reads, other tenants' data, "act as any user".

## Step 3 — Decide where value moves (per action)
For each A/B action ask: **could we sell the *result* of this action instead of access to it?** (Sequoia: sell the work.) Mark candidates for per-outcome pricing (see `pricing-models.md`).

## Step 4 — Write the user journeys ("how will the user do that")
For the top 3–5 jobs, write exactly what a user does. Template:

```
### Job: <verb + outcome>, e.g. "Get my new ad on the lobby screens tonight"
Who: <persona>          Surface: Claude / ChatGPT / Gemini / Cursor / CLI / phone
First run (once):
  1. In <app> → Settings → AI assistant → "Create key" (copy, shown once)
  2. In Claude → Settings → Connectors → Add custom connector → <https://app/api/mcp/KEY>
     (or: `claude mcp add --transport http <app> https://app/api/mcp -H "Authorization: Bearer KEY"`)
Every time:
  You say: "<natural request>"
  Agent does: <tool calls in order> (A-class, no interruption)
  You see: <ui:// card or text>, e.g. preview of the ad with the screens it will run on
  Approval: <B-class step> → "Approve" on the card / phone notification → executes
  Result: <outcome + where it's logged / what it cost in credits>
Fallback: <the fixed screen URL if the user prefers clicking>
```

Write journeys in the user's words. If a journey needs more than one approval or more than two clicks outside chat, the action map is wrong. Merge or reclassify.

## Step 5 — The action map table (put this first in PLAN.md)

| Action (user words) | Class | Tool name | CLI | Approval | UI card | Price unit | Notes |
|---|---|---|---|---|---|---|---|
| Publish an ad to screens | B | `publish_ad` | `app ads publish` | owner, 1 tap | preview + screens | per verified play | logs to audit |

## Anti-patterns
- Exposing every endpoint 1:1 as a tool ("CRUD-as-tools"). Agents drown, and descriptions collide. Design around jobs.
- Gating reads. Approval fatigue makes people rubber-stamp.
- A chat widget bolted onto the old UI and called "agentic" (Koomen's "AI horseless carriage").
- Letting the agent approve its own action (`confirm: true` alone is not a human).
- Removing the fixed screen before agents have proven the job in the audit log.
