# agent-led-product

**An agent skill that scores any software product for the agent era, then turns it into an agent-led product.**

Agents are becoming the main users of software:
- Salesforce made its whole platform "No Browser Required" (April 2026).
- Anthropic and OpenAI co-built MCP Apps, so UI now renders *inside* the agent (January 2026).
- Writing code costs close to nothing now.

What matters now is whether an agent can **operate** your product, whether you **charge per action or outcome**, whether risky agent actions **wait for a human**, and whether your UI **shows up inside Claude, ChatGPT and Gemini**.

This skill answers those questions about *your* code, then helps you fix the gaps.

```
> score my app for agent readiness
> what in this product should be agentic, and what should stay human?
> turn this project into an agent-led product
> audit all my projects in ~/code
> is this a good idea to build in 2026?
```

## What it does

| Mode | You get |
|---|---|
| **Audit** | A 0–10 **Agent-Readiness Score** with file-path evidence for each of 10 questions, a band (at risk / transitioning / agent-native), the top gaps and the single highest-leverage fix → `docs/agent-led/AUDIT.md` |
| **Agentify plan** | Every feature mapped to *agent does it* / *agent asks, human approves* / *human only* / *show a card in the chat* / *keep the screen*, plus step-by-step journeys for how real users will do each job from Claude, ChatGPT, a CLI or a phone → `docs/agent-led/PLAN.md` |
| **Convert** | Working code, layer by layer: service layer → scoped API keys → MCP server → audit log + human approvals → `llms.txt` / `.well-known/mcp` → CLI → per-action credits → MCP Apps `ui://` cards → distribution. Each layer is verified before the next. |
| **Portfolio** | One ranked scoreboard across many repos, with charts and double-down / quick-win / merge / retire / monetise buckets, plus a 30/60/90-day plan |
| **Verify** | MCP smoke test + "fresh agent" task test + before/after score |
| **Strategy** | Judges an idea against five evidence-backed bets for 2026, and says so plainly when the answer is "don't build this" |

### The 10-question scorecard
1. Can an agent do every core action through an API or MCP tool?
2. Is there a CLI with machine-readable output?
3. Are the docs agent-readable (`llms.txt`, OpenAPI, `.well-known/mcp`, SKILL.md)?
4. Can an agent authenticate without a browser, with scoped access?
5. Is pricing per action or outcome, not per seat?
6. Does it own data a model can't recreate?
7. Does it sell a finished outcome, not just a tool?
8. Are agent actions audited, and risky ones human-approved?
9. Can its UI render inside the agents people use (MCP Apps / A2UI)?
10. Does a better model make it stronger, not obsolete?

Every market claim the skill uses is dated and sourced in [`references/evidence.md`](skills/agent-led-product/references/evidence.md). It also lists quotes that circulate online but couldn't be verified, so the skill never repeats them.

## Install

**Any agent (Claude Code, Cursor, Codex, Gemini CLI, …), via the open skills CLI:**
```bash
npx skills add labKnowledge/agent-led-product
```

**Claude Code plugin:**
```
/plugin marketplace add labKnowledge/agent-led-product
/plugin install agent-led-product@agent-led-product
```

**Manual:**
```bash
git clone https://github.com/labKnowledge/agent-led-product.git
mkdir -p ~/.claude/skills && cp -r agent-led-product/skills/agent-led-product ~/.claude/skills/
```

Then open your project in your agent and ask: *"score this project for agent readiness"*.

## What's inside

```
skills/agent-led-product/
├── SKILL.md                    # entry point: picks the mode from your request
├── references/                 # scorecard, agentify decision matrix, conversion playbook,
│                               # tool design, pricing models, portfolio criteria, evidence, report templates
├── scripts/
│   ├── scan.py                 # finds MCP tools, CLIs, routes, keys, billing, audit, approvals, MCP Apps signals
│   │                           # + an action inventory + provisional score (Python stdlib only)
│   ├── mcp_smoke.mjs           # smoke-tests any MCP endpoint (auth, tools, descriptions, gating)
│   └── chart.py                # scoreboard + coverage charts (needs matplotlib)
└── templates/                  # Next.js/TypeScript + FastAPI starting points: scoped keys, stateless MCP route,
                                # permission-gated server, audit log + approvals, credits ledger, llms.txt,
                                # MCP Apps card, CLI that drives your own MCP endpoint
```

Run the tools directly if you like:
```bash
python3 skills/agent-led-product/scripts/scan.py ./my-project --md
python3 skills/agent-led-product/scripts/scan.py ~/code --portfolio --md
MY_KEY=... node skills/agent-led-product/scripts/mcp_smoke.mjs https://myapp.com/api/mcp --key-env MY_KEY
```

## Design principles
- **Agentify actions, not screens.** People keep the 1–3 moments where they must see, choose or sign off.
- **Agents never approve their own risky actions.** Approval happens in a human-authenticated surface, never through a tool on the same key.
- **Evidence only.** Scores cite file paths. Market claims cite dated sources.
- **Do the hard part for the user.** One clear next step per report, inferred defaults over questions.

## Requirements
- Python 3.9+ for `scan.py` (stdlib only); `matplotlib` for charts
- Node 18+ for `mcp_smoke.mjs` and the CLI template
- Templates target `@modelcontextprotocol/sdk` ≥ 1.2x (TypeScript) and `mcp` ≥ 1.10 (Python). MCP Apps is new (Jan 2026), so check the current spec before shipping UI cards.

## License
MIT © labKnowledge
