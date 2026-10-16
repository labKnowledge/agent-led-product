// TEMPLATE: MCP server with permission-gated tools, logging, approvals and credits (L3+L4+L7).
// Tools call the SAME service functions as the UI (L1). Adapt names to the domain.
import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Actor } from "@/server/services/apiKeys";
import { requestApproval } from "@/server/services/agentActivity";
import { chargeCredits, priceOf, PRICING } from "@/server/services/credits";
import * as items from "@/server/services/items"; // ← your domain services

type Content = { type: "text"; text: string } | { type: "image"; data: string; mimeType: string };
type ToolResult = { content: Content[]; isError?: boolean; structuredContent?: Record<string, unknown> };

const ok = (data: unknown): ToolResult => ({ content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] });
const fail = (message: string): ToolResult => ({ content: [{ type: "text", text: message }], isError: true });

/** Which permission each tool needs. Tools the key can't use are never listed. */
const TOOL_ACCESS: Record<string, string> = {
  get_overview: "reports.view",
  list_items: "items.view",
  get_item: "items.view",
  create_item: "items.edit",       // class A: reversible, own space
  publish_item: "items.publish",   // class B: needs human approval
  get_pricing: "items.view",
  list_activity: "reports.view",
};

export async function createMcpServer(ctx: {
  actor: Actor;
  baseUrl: string;
  req: Request;
  log: (e: { actor: Actor; tool: string; args: unknown; ok: boolean; error?: string; ms: number; req: Request }) => Promise<void>;
}) {
  const { actor } = ctx;
  const perms = await items.permissionsFor(actor.ownerId); // owner's CURRENT permissions
  const can = (need: string) => perms.has(need) && (actor.scopes.length === 0 || actor.scopes.includes(need));

  const server = new McpServer(
    { name: "myapp", version: "0.0.1" },
    {
      instructions:
        "MyApp does <one-line domain>. Typical workflow: get_overview → list_items → create_item → publish_item (publishing waits for the owner's approval). " +
        "Tools accept names or ids. Costs are in credits; call get_pricing or pass dryRun to see cost first. " +
        `You act as ${actor.keyName} with their access; only tools they may use are listed.`,
    },
  );

  // Gate + log every tool: wrap registerTool once.
  const register = server.registerTool.bind(server) as (...a: unknown[]) => unknown;
  server.registerTool = ((name: string, config: unknown, handler: (args: unknown) => Promise<ToolResult>) => {
    const need = TOOL_ACCESS[name];
    if (!need || !can(need)) return undefined;
    return register(name, config, async (args: unknown) => {
      const t0 = Date.now();
      try {
        const res = await handler(args);
        await ctx.log({ actor, tool: name, args, ok: !res.isError, error: res.isError ? res.content[0]?.type === "text" ? (res.content[0] as { text: string }).text : "error" : undefined, ms: Date.now() - t0, req: ctx.req });
        return res;
      } catch (e) {
        const ref = Math.random().toString(36).slice(2, 8);
        console.error(`[mcp] ${name} failed ref=${ref}`, e);
        await ctx.log({ actor, tool: name, args, ok: false, error: (e as Error).message, ms: Date.now() - t0, req: ctx.req });
        return fail(`Something went wrong (ref ${ref}).`);
      }
    });
  }) as typeof server.registerTool;

  const ITEM = z.string().describe("Item name or id");

  server.registerTool(
    "get_overview",
    { title: "Overview", description: "Today at a glance: counts, recent activity, what needs attention. Start here." },
    async () => ok(await items.overview(actor.ownerId)),
  );

  server.registerTool(
    "list_items",
    {
      title: "List items",
      description: "Items with status. Filter by text or status. Returns ids, names, status and preview links.",
      inputSchema: { q: z.string().optional().describe("Search text"), status: z.enum(["draft", "live", "archived"]).optional(), cursor: z.string().optional() },
    },
    async (a) => ok(await items.list(actor.ownerId, a)),
  );

  server.registerTool(
    "create_item",
    {
      title: "Create item (draft)",
      description: "Create a DRAFT item. Safe to call; nothing goes live until publish_item is approved.",
      inputSchema: { name: z.string().min(1).max(120), body: z.string().max(20_000).describe("Content"), idempotencyKey: z.string().optional() },
    },
    async (a) => {
      const res = await items.createDraft(actor.ownerId, a);
      return "error" in res ? fail(res.error) : ok({ ...res, next: "preview it, then publish_item" });
    },
  );

  server.registerTool(
    "publish_item",
    {
      title: "Publish item (needs approval)",
      description: `Ask the owner to approve publishing. Costs ${priceOf("publish")} credits once it runs. Use dryRun to check first.`,
      inputSchema: { item: ITEM, dryRun: z.boolean().default(false) },
    },
    async (a) => {
      const it = await items.resolve(actor.ownerId, a.item);
      if ("error" in it) return fail(it.error);
      if (a.dryRun) return ok({ wouldPublish: it.name, cost: priceOf("publish") });
      // Class B: never act directly — create a pending action the human approves.
      const pending = await requestApproval({
        actor,
        tool: "publish_item",
        args: { id: it.id },
        summary: `Publish "${it.name}"`,
        cost: priceOf("publish"),
        // runs only after approval (in-app / phone / MCP Apps card):
        execute: async () => {
          const charged = await chargeCredits({ ownerId: actor.ownerId, action: "publish", actor: actor.keyPrefix, idempotencyKey: `publish:${it.id}` });
          if (!charged.ok) return { error: charged.error };
          return items.publish(actor.ownerId, it.id);
        },
      });
      return ok({ status: "waiting_for_approval", ref: pending.id, approver: pending.approver, approveUrl: pending.url });
    },
  );

  server.registerTool(
    "get_pricing",
    { title: "Pricing", description: "Credit cost of each action and the current balance." },
    async () => ok({ pricing: PRICING, balance: await items.balance(actor.ownerId) }),
  );

  return server;
}
