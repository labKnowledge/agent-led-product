// TEMPLATE: tool-call audit log + human approval queue (L4).
// Proven in production: one log row per tool call; approval as a review lane the human applies or discards.
// Storage is abstract — implement with the project's DB.
import "server-only";
import type { Actor } from "./apiKeys";

// ---------- Audit log ----------
export interface ToolCallLog {
  at: Date;
  keyId: string;
  keyPrefix: string;
  ownerId: string;
  tool: string;
  argsSummary: Record<string, unknown>; // sanitized + truncated — never secrets
  ok: boolean;
  error?: string;
  durationMs: number;
  ip?: string;
  userAgent?: string;
}
export interface AuditStore { insertLog(l: ToolCallLog): Promise<void>; }
let audit: AuditStore; // bind at startup: setAuditStore(...)
export const setAuditStore = (s: AuditStore) => (audit = s);

const SECRET_KEYS = /pass(word)?|secret|token|key|authorization|card|ssn|cvv/i;
export function summarize(args: unknown, depth = 0): Record<string, unknown> {
  if (!args || typeof args !== "object" || depth > 2) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args as Record<string, unknown>)) {
    if (SECRET_KEYS.test(k)) out[k] = "[redacted]";
    else if (typeof v === "string") out[k] = v.length > 120 ? `${v.slice(0, 120)}… (${v.length} chars)` : v;
    else if (Array.isArray(v)) out[k] = `[${v.length} items]`;
    else if (v && typeof v === "object") out[k] = summarize(v, depth + 1);
    else out[k] = v;
  }
  return out;
}

export async function logToolCall(e: { actor: Actor; tool: string; args: unknown; ok: boolean; error?: string; ms: number; req: Request }) {
  await audit?.insertLog({
    at: new Date(),
    keyId: e.actor.keyId,
    keyPrefix: e.actor.keyPrefix,
    ownerId: e.actor.ownerId,
    tool: e.tool,
    argsSummary: summarize(e.args),
    ok: e.ok,
    error: e.error?.slice(0, 500),
    durationMs: e.ms,
    ip: e.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: e.req.headers.get("user-agent") ?? undefined,
  });
}

// ---------- Approvals (class-B actions) ----------
export type PendingStatus = "pending" | "approved" | "denied" | "expired" | "executed" | "failed";
export interface PendingAction {
  id: string;
  ownerId: string;
  requestedBy: string;    // key prefix / agent name
  tool: string;
  args: Record<string, unknown>;
  summary: string;        // human sentence shown on the approval card
  cost?: number;
  status: PendingStatus;
  createdAt: Date;
  expiresAt: Date;
  decidedBy?: string;
  decidedAt?: Date;
  result?: unknown;
}
export interface ApprovalStore {
  insert(p: Omit<PendingAction, "id">): Promise<PendingAction>;
  get(id: string): Promise<PendingAction | null>;
  update(id: string, patch: Partial<PendingAction>): Promise<void>;
}
let approvals: ApprovalStore;
export const setApprovalStore = (s: ApprovalStore) => (approvals = s);

/** Executors are registered by tool name so a restart can still run approved actions. */
type Executor = (args: Record<string, unknown>, ownerId: string) => Promise<unknown>;
const executors = new Map<string, Executor>();
export const registerExecutor = (tool: string, fn: Executor) => executors.set(tool, fn);

export async function requestApproval(input: {
  actor: Actor; tool: string; args: Record<string, unknown>; summary: string; cost?: number;
  execute?: () => Promise<unknown>; ttlHours?: number;
}) {
  if (input.execute) registerExecutor(input.tool, () => input.execute!()); // simple case; prefer registerExecutor at boot
  const p = await approvals.insert({
    ownerId: input.actor.ownerId,
    requestedBy: input.actor.keyPrefix,
    tool: input.tool,
    args: input.args,
    summary: input.summary,
    cost: input.cost,
    status: "pending",
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + (input.ttlHours ?? 24) * 3600_000),
  });
  await notifyOwner(p); // in-app badge + push/phone (e.g. a phone/chat approval channel) + email
  return { id: p.id, approver: "the account owner", url: `/approvals/${p.id}` };
}

/** Called ONLY from a human-authenticated surface (web session, signed phone link). Never from an MCP tool on the requesting key. */
export async function decide(id: string, humanId: string, approve: boolean) {
  const p = await approvals.get(id);
  if (!p || p.status !== "pending") return { error: "Not pending." };
  if (p.expiresAt < new Date()) { await approvals.update(id, { status: "expired" }); return { error: "Expired." }; }
  if (!approve) { await approvals.update(id, { status: "denied", decidedBy: humanId, decidedAt: new Date() }); return { status: "denied" }; }
  await approvals.update(id, { status: "approved", decidedBy: humanId, decidedAt: new Date() });
  const run = executors.get(p.tool);
  if (!run) return { error: `No executor for ${p.tool}` };
  try {
    const result = await run(p.args, p.ownerId);
    await approvals.update(id, { status: "executed", result });
    return { status: "executed", result };
  } catch (e) {
    await approvals.update(id, { status: "failed", result: { error: (e as Error).message } });
    return { error: (e as Error).message };
  }
}

async function notifyOwner(p: PendingAction) {
  // Wire to the project's notifications. Keep the message one line: "<agent> wants to: <summary> (cost N). Approve?"
  console.info(`[approval] ${p.requestedBy} wants to: ${p.summary}${p.cost ? ` (cost ${p.cost})` : ""}`);
}
