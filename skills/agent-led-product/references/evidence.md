# Evidence base (2025–2026): use only what's here, or verify fresh

Compiled from the "Builder's Field Guide" research (NotebookLM notebook of about 275 sources + web verification, Oct 15 2026). **Cite dates and sources.** Label vendor and aggregator stats as estimates. If you need anything newer, search the web and verify against a primary source first.

## The shift (verified)

**Headless / API-first**
- **Salesforce Headless 360** (TDX, Apr 15 2026): "No Browser Required."
  - "Everything on Salesforce is now an API, MCP tool, or CLI command."
  - Ships with 60+ MCP tools and 30 coding skills.
  - Renamed **AIforce** (Sep 2026); agents must be registered and are metered in **Flex Credits**.
  - Source: salesforce.com news; help.salesforce.com.
- **Parker Harris** (Salesforce co-founder, Slack CTO): "Why should you ever log into Salesforce again? Maybe you never will." (SalesforceBen)
- **Satya Nadella** (BG2 podcast, Dec 2024): business apps are "essentially CRUD databases with a bunch of business logic… the business logic is all going to these agents." Wording varies slightly by outlet.
- **MCP** became the common agent-to-tool standard: Anthropic, then OpenAI, Google and Microsoft. Donated to the Linux Foundation's Agentic AI Foundation (Dec 2025). **A2A** (Google → Linux Foundation, 2025–26) handles agent-to-agent calls.
- **Agentic commerce:**
  - OpenAI + Stripe ACP (Sep 2025)
  - Google + Shopify **UCP** (Jan 2026)
  - OpenAI scaled back Instant Checkout (Mar 2026); agents win at discovery before transactions.
- **Microsoft Build 2026:** Windows positioned as an OS for agents (Execution Containers, Windows 365 for Agents); Work IQ over MCP with "10 generic tools with progressive disclosure".

**CLI as the agent surface**
- Claude Code (Feb 2025); OpenAI Codex CLI.
- GitHub Copilot CLI is generally available (2026).
- Google Gemini CLI → **Antigravity CLI** (I/O, May 2026).
- **Google Workspace CLI `gws`** (Mar 2026): Gmail/Drive/Calendar/Docs/Sheets/Chat/Admin, MCP, 40+ agent skills. Whether Google officially supports it is disputed.

**Need-based / generated UI**
- **Google Generative UI** in Gemini 3 (dynamic view, Nov 18 2025): a custom interactive UI per prompt.
- **A2UI** open protocol, now in Gemini Enterprise (2026).
- **MCP Apps** (Jan 26 2026), co-developed by Anthropic and OpenAI. Tools return interactive UI (sandboxed iframes, `ui://` resources) inside Claude, ChatGPT, VS Code and Goose. Launch partners: Asana, Figma, Slack, Salesforce, Canva, Amplitude, Box, Hex, monday.com, Clay.
  - OpenAI's Nick Cooper: "MCP inverts this by making apps pluggable components within agents."
  - VS Code's Harald Kirschner: "…the client can give you the right interaction without turning the conversation into a choose-your-own-adventure prompt."
- **OpenAI Apps in ChatGPT / Apps SDK** (Oct 6 2025).

**Code is nearly free**
- **Cursor** about $1B ARR (Nov 2025), reported about $2B run-rate Q1 2026 *(estimates)*.
- **Lovable** $400–600M ARR, $13.3B valuation, Aug 2026 *(estimates)*.
- **Replit** $265M ARR at end of 2025 (company figure).
- **Base44**: solo bootstrapped founder Maor Shlomo; sold to Wix for $80M upfront about 6 months after launch (Jun 2025); reported $100M ARR by Mar 2026 (Globes, Calcalist).
- **Karpathy**, "Software 3.0" (YC, Jun 2025): prompts are programs; "build for agents" (llms.txt, Markdown docs, commands instead of clicks).

## The five bets (ranked by evidence)

1. **Sell the work, not the tool** (vertical autopilots / AI-native services).
   - Sequoia, *Services: The New Software* (Julien Bek, 2026): "If you sell the tool, you're in a race against the model… A copilot sells the tool. An autopilot sells the work."
   - YC Requests for Startups 2026: insurance, accounting, tax, audit, compliance, healthcare admin.
   - Risk: liability.
2. **Software for agents** (MCP servers, CLIs, paid tools).
   - x402: about 138M agent payments in a year (Chainalysis, Oct 15 2026).
   - Indie MCP tools charge $0.005–0.01/call.
   - No reliable indie earnings data yet.
3. **Proprietary data/context.** It counts only if usage improves the product (Oliver Wyman, Sep 2026). Public-data products get copied by LLMs.
4. **Custom tools for one person or a few.**
   - YC (Pete Koomen) asks for purpose-built tools for one or a handful of users.
   - Amodei: software made "ad hoc… in a few seconds for less than a dollar."
5. **Narrow governance/trust infrastructure.**
   - Gartner (as cited): >40% of agentic AI projects cancelled by 2027.
   - Salesforce requires agent registration.

## What not to build
- **Thin wrappers:** you race the model (Sequoia; Koomen's "AI horseless carriages").
- **Horizontal per-seat CRUD SaaS:** Nadella; pricing is moving to agent actions.
- **Products usable only through their own screen.**
- **Agent-checkout-dependent plays:** see Instant Checkout, Mar 2026.
- **Unsupervised autopilots in regulated fields:** **Medvi** was profiled by the NYT (Apr 2026) as a near-solo $401M telehealth company. The FDA had sent a warning letter on Feb 20 2026; there are fake-doctor-account allegations and a partner breach of up to 1.6M records. Use it **only as a cautionary tale**.

## Skeptics (include for balance)
- "SaaS isn't dead, it's going hybrid": CIO; Forbes, Apr 2026; Fortune / Microsoft VP, Sep 2026. Systems of record survive.
- Dev Nag (QueryPal): vendors predicting SaaS collapse are selling agent platforms.
- Ryan Gaines (N6 Finance, Mar 2026): "When a copilot makes an error, a human catches it. When an autopilot makes an error, the customer eats it."
- The one-person $1B company is **not confirmed**. Amodei gave 70–80% odds for 2026.

## DO NOT USE (unverified / fabricated)
- Paul Graham "I was wrong to be so absolute about needing co-founders": no primary source, likely fabricated.
- "Vibe coding will eat SaaS" (Garry Tan), "every employee can be a department" (Jensen Huang), "Our API is the UI" (Benioff): secondary blogs only.
- "80% of Fortune 500 run agents", "97M MCP SDK downloads/month", "14,000 MCP servers", "wrappers declining −6%/month": aggregator stats. Use only with an "industry estimate" label.
