// TEMPLATE: scoped API keys for agents (L2). Adapt names, the DB layer and the
// permission model to the project. Proven in production across several Next.js apps.
//
// Rules: store only a SHA-256 hash · show the key once · prefix for recognition ·
// revocable · lastUsedAt · a key never exceeds its owner's permissions ·
// creating keys is a HUMAN-ONLY action (never an MCP tool).
import "server-only";
import { createHash, randomBytes } from "node:crypto";

const APP = "myapp"; // key prefix, e.g. "acme", "sk"

export type Scope = string; // e.g. "ads:read" | "ads:write" | "reports:read" — or reuse role permissions
export interface ApiKeyRecord {
  id: string;
  name: string;
  hash: string;
  prefix: string;
  ownerId: string;
  orgId?: string;
  scopes: Scope[];          // empty = inherit owner's permissions
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
}

/** Storage adapter: implement with the project's DB (Mongo/Prisma/Drizzle/SQL). */
export interface ApiKeyStore {
  insert(rec: Omit<ApiKeyRecord, "id">): Promise<ApiKeyRecord>;
  findActiveByHash(hash: string): Promise<ApiKeyRecord | null>; // not revoked, not expired
  touch(id: string): Promise<void>;                              // lastUsedAt = now
  revoke(id: string, ownerId?: string): Promise<boolean>;
  listForOwner(ownerId: string | null): Promise<ApiKeyRecord[]>;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createApiKey(store: ApiKeyStore, ownerId: string, name: string, scopes: Scope[] = []) {
  // base64url only — safe as a URL path segment for URL-only connectors.
  const key = `${APP}_${randomBytes(24).toString("base64url")}`;
  await store.insert({
    name: name.trim().slice(0, 60) || "AI assistant",
    hash: sha(key),
    prefix: key.slice(0, 12),
    ownerId,
    scopes,
    createdAt: new Date(),
    lastUsedAt: null,
  });
  return key; // show ONCE in the UI; never log it
}

export interface Actor {
  keyId: string;
  keyPrefix: string;
  keyName: string;
  ownerId: string;
  orgId?: string;
  scopes: Scope[];
}

/** `Authorization: Bearer <key>` or a key from the URL path → the actor it acts for. */
export async function authenticateApiKey(store: ApiKeyStore, req: Request, keyInPath?: string): Promise<Actor | null> {
  const header = req.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : (keyInPath ?? "").trim();
  if (!key.startsWith(`${APP}_`)) return null;
  const rec = await store.findActiveByHash(sha(key));
  if (!rec) return null;
  void store.touch(rec.id);
  return { keyId: rec.id, keyPrefix: rec.prefix, keyName: rec.name, ownerId: rec.ownerId, orgId: rec.orgId, scopes: rec.scopes };
}

/** Effective permission = key scope ∩ owner's current permissions (owner may have lost access since). */
export function allowed(actor: Actor, ownerPermissions: Set<string>, need: string): boolean {
  if (!ownerPermissions.has(need)) return false;
  return actor.scopes.length === 0 || actor.scopes.includes(need);
}
