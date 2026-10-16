# Pricing for agent-led products

When agents do the work, **seats shrink**. Price the thing the agent produces or consumes.

| Model | When it fits | Evidence / precedent | Watch out |
|---|---|---|---|
| **Per outcome** | The product delivers a result the customer values and can verify (booked appointment, verified ad play, fixed bug PR, finished book, filed form) | Sequoia "sell the work". YC 2026 Requests for Startups (AI-native services). book platforms priced per finished book | Define "done" precisely. Refund or credit on failure. Liability for autopilot errors |
| **Per action (credits)** | Many distinct actions with different costs (generate, send, render, analyze) | Salesforce Flex Credits per agent action (AIforce, Sep 2026). wallet + usage-ledger pattern | Show price per action *before* it runs (`dryRun`). Low-balance alerts |
| **Per call (micro)** | Agent-to-agent tools, data lookups, utilities sold to *other people's* agents | x402 HTTP 402 payments: about 138M agent payments (Chainalysis, Oct 15 2026). Indie tools at $0.005–0.01/call | No reliable indie earnings data yet. Discovery via directories/bazaars |
| **Hybrid: platform fee + usage** | B2B with onboarding and support costs | Common SaaS-to-agent transition | Keep the platform fee small. Usage carries growth |
| **Seat / flat subscription** | Only for human-heavy workflows that stay human | Legacy | Becomes a cap on growth as agents replace seats |

## Credits ledger rules (implementation)
- **Wallet** per owner (org or user): `balance`, `lifetimePurchased`, `lifetimeSpent`, plus subscription fields.
- **Append-only ledger**: `type` (purchase | grant | consumption | refund | adjustment), `credits` (signed), `balanceAfter`, `action`, `actor` (user/key/agent), `relatedId`, `idempotencyKey`, timestamp.
- **Debit on success only.** Reserve, then commit for long jobs. Release on failure.
- **Atomic**: conditional update `balance >= cost`, then insert the ledger row in the same transaction or with a compensating entry.
- **Price table in config** (`action → credits`), versioned, returned by a `get_pricing` tool so agents can plan.
- Every debit is visible to the user: the ledger page plus "this cost N credits" in tool output.
- Reuse the project's existing wallet/ledger if it has one. Template: `templates/nextjs/credits.ts`.

## Picking the unit
1. List the outcomes from the action map (Class A/B with an outcome).
2. For each: can the customer verify it happened? Does it map to value they'd pay a person for?
3. Choose the **smallest verifiable unit of value** as the price unit. Fall back to credits per action.
4. Sanity check against what customers pay today: human service price, tool price. Price between them.
