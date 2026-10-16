# Report templates

Write to `docs/agent-led/` in the project, or wherever the project keeps docs. Chat gets 3–6 lines: score, band, top gap, and the one next move, plus the file path.

---

## AUDIT.md

```markdown
# Agent-Readiness Audit — <Product>
*<date> · scope: <repo path> · method: scan.py + code reading · scorecard v1 (agent-led-product skill)*

## Verdict
**<score>/10 · <band>.** <One sentence: what it already does well for agents, and the single biggest gap.>
**Highest-leverage move:** <one action, why, effort estimate>.

## Scorecard
| # | Question | Score | Evidence (file paths) | Gap → fix |
|---|---|---|---|---|
| Q1 | API/MCP covers core actions | 1 | `src/server/mcp/server.ts` (41 tools) | — |
| Q2 | CLI | 0 | none | ship `app` CLI (L6) |
| … | … | … | … | … |
| | **Total** | **x/10** | | |

## What agents can do today
<Tool list grouped by job; what's missing vs the action inventory.>

## Top 3 gaps (ordered by leverage)
1. **<gap>**: why it matters (evidence: <dated source>) → fix (<layer>, effort).
2. …
3. …

## Risks
<Security, liability, regulated data, platform dependency, model-commoditization.>

## Next steps
- [ ] <layer / action> (owner, effort)
- [ ] …
```

---

## PLAN.md (agentify plan)

```markdown
# Agent-Led Plan — <Product>
*<date> · builds on AUDIT.md (<score>/10)*

## Action map
| Action (user words) | Class A/B/C/D/E | Tool | CLI | Approval | UI card | Price unit | Notes |
|---|---|---|---|---|---|---|---|

Classes: A agent-autonomous · B agent + human approval · C human-only · D generated UI moment · E keep fixed screen.

## What stays human, and why
<C and E actions with the reason: liability, identity, muscle memory, audit.>

## How users will do it (journeys)
### Job 1: <…>
<template from agentify-decision.md>

## Pricing
<from → to; price unit per outcome/action; credits table; what changes for existing customers.>

## Conversion roadmap
| Layer | Scope for this product | Effort | Acceptance check |
|---|---|---|---|
| L1 service layer | … | … | UI + MCP call the same functions |
| L2 scoped keys | … | … | key shown once, hashed, revocable, scopes enforced |
| L3 MCP | … | … | mcp_smoke passes; top 3 jobs done by a fresh agent |
| L4 audit + approvals | … | … | every call logged; B-class actions pend until approved |
| L5 agent docs | … | … | llms.txt, /.well-known/mcp, OpenAPI live |
| L6 CLI | … | … | `app <noun> <verb> --json` for top jobs |
| L7 pricing | … | … | debits on success; get_pricing tool; ledger page |
| L8 ui:// cards | … | … | card renders in Claude + ChatGPT; text fallback |
| L9 distribution | … | … | connector guide in Settings; directory listings |

**Target score after roadmap:** <x>/10.
```
