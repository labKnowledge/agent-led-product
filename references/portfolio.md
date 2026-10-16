# Portfolio mode — many projects at once

## Process
1. `scan.py <parent> --portfolio --out portfolio.json --md` for one row per project, plus the action inventory.
2. Separate **products** (have users, a domain, data) from **utilities/tooling** (single-purpose, free, dev tools). Score products in depth. List utilities with one line each.
3. Fan out read-only subagents in groups of 7–13 projects. Give each the 10 questions verbatim from `scorecard.md`. Require file paths and a per-question breakdown. **Re-add every total yourself.** Subagents miscount.
4. Build `scores.json` (`{"product": [q1..q10], ...}`) and run `chart.py scores.json <out>` for the scoreboard and coverage charts.
5. Write `PORTFOLIO-AUDIT.md` (sections below), and post or share where the user tracks work if they ask.

## Decision criteria

| Bucket | Criteria |
|---|---|
| **Double down** | Score ≥ 5 **and** Q6 (data) ≥ 0.5 **and** Q7 (outcome) ≥ 0.5 **and** has paying users or a clear payer |
| **Quick win** | Keys or a versioned API already exist (Q4 ≥ 0.5) but no MCP (Q1 ≤ 0.5). Days of work to add MCP |
| **Monetise** | Delivers an outcome (Q7 ≥ 0.5) but Q5 = 0 (free / no billing) |
| **Merge** | Same domain, users or data model as another project (duplicate ledgers, the same entity names) |
| **Retire / park** | Score ≤ 2 **and** Q10 = 0 (the next model replaces it) **and** no paying users. Or the README already says archived |
| **Maintain only** | Client-contract or kiosk deployments with no growth path. Fix build or security debt only |

## Portfolio-wide gaps → one shared kit
If the same question is weak across most products (coverage < 40% in `portfolio-gaps.png`), don't fix it product by product. Build a shared **agent-ready kit** once:
- scoped keys + MCP route + `.well-known/mcp` (extract from the best in-house implementation)
- `llms.txt` + OpenAPI generation from routes
- credits wallet + ledger
- per-tool-call usage log
- an approval service (pending actions + notify the owner, e.g. via a phone/chat channel)
- a `ui://` card helper
- a CLI generator driven by the same tool definitions

## Report skeleton
1. Verdict (average, bands, top score, 0 agent-native?), plus the scoreboard chart
2. Coverage per question chart → the portfolio-wide gaps
3. Ranked scoreboard table (score, what earns points, biggest gap)
4. Evidence notes for the top products (file paths)
5. Mapping to the five bets (`evidence.md`)
6. Action plan: **Phase 0 this week** (decisions) · **Days 1–30** shared kit · **Days 31–60** top products + quick wins · **Days 61–90** monetise + re-score, with targets (avg ≥ 6, ≥ 3 agent-native, 0 unauthenticated)
7. Merge/retire table · caveats (repos not visible, provisional scores)
