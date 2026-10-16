// TEMPLATE: credits wallet + append-only ledger for per-action / per-outcome pricing (L7).
// Proven in production: wallet per owner + append-only usage ledger + versioned price config.
// Rules: debit on SUCCESS only · idempotent · atomic balance check · every debit visible to the user.
import "server-only";

/** Versioned price table. Expose it via a `get_pricing` tool so agents can plan. */
export const PRICING = {
  version: "2026-10",
  unit: "credit",
  creditUsd: 0.01,
  actions: {
    publish: 50,      // per outcome, e.g. per published/verified result
    generate: 10,
    report: 2,
  } as Record<string, number>,
};
export const priceOf = (action: string) => PRICING.actions[action] ?? 0;

export type LedgerType = "purchase" | "grant" | "consumption" | "refund" | "adjustment";
export interface LedgerEntry {
  ownerId: string;
  type: LedgerType;
  credits: number;          // signed: +purchase/grant/refund, −consumption
  balanceAfter: number;
  action?: string;
  actor: string;            // user id, key prefix, or "system"
  relatedId?: string;
  idempotencyKey?: string;  // unique per owner
  details?: string;
  at: Date;
}
export interface CreditsStore {
  /** Atomically: if balance >= cost, decrement and return new balance; else null. */
  decrementIfEnough(ownerId: string, cost: number): Promise<number | null>;
  increment(ownerId: string, credits: number): Promise<number>;
  findByIdempotencyKey(ownerId: string, key: string): Promise<LedgerEntry | null>;
  insertLedger(e: LedgerEntry): Promise<void>;
  balance(ownerId: string): Promise<number>;
}
let store: CreditsStore;
export const setCreditsStore = (s: CreditsStore) => (store = s);

export async function chargeCredits(i: { ownerId: string; action: string; actor: string; idempotencyKey: string; relatedId?: string; cost?: number }) {
  const cost = i.cost ?? priceOf(i.action);
  if (cost <= 0) return { ok: true as const, cost: 0, balance: await store.balance(i.ownerId) };
  const dup = await store.findByIdempotencyKey(i.ownerId, i.idempotencyKey);
  if (dup) return { ok: true as const, cost: 0, balance: dup.balanceAfter, duplicate: true };
  const after = await store.decrementIfEnough(i.ownerId, cost);
  if (after === null) {
    const bal = await store.balance(i.ownerId);
    return { ok: false as const, error: `Not enough credits: ${i.action} costs ${cost}, balance is ${bal}. Top up in Settings → Billing.` };
  }
  await store.insertLedger({ ownerId: i.ownerId, type: "consumption", credits: -cost, balanceAfter: after, action: i.action, actor: i.actor, relatedId: i.relatedId, idempotencyKey: i.idempotencyKey, at: new Date() });
  return { ok: true as const, cost, balance: after };
}

/** For long jobs: reserve first, then refund on failure (compensating entry keeps the ledger append-only). */
export async function refundCredits(ownerId: string, credits: number, actor: string, relatedId?: string, details = "refund: action failed") {
  const after = await store.increment(ownerId, credits);
  await store.insertLedger({ ownerId, type: "refund", credits, balanceAfter: after, actor, relatedId, details, at: new Date() });
  return after;
}

// Billing hooks:
// - Stripe Checkout "credit pack" → webhook checkout.session.completed → increment + ledger(type: "purchase")
// - Subscription renewal → ledger(type: "grant")
// - Usage-based Stripe plans → also send a meter event per consumption
// - Selling tools to OTHER people's agents per call → consider x402 (HTTP 402) instead of accounts.
