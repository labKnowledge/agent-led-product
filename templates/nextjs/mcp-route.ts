// TEMPLATE: Streamable HTTP MCP endpoint for Next.js App Router (L3).
// Files:  src/app/api/mcp/route.ts            → export { handle as GET, POST, DELETE }
//         src/app/api/mcp/[key]/route.ts      → same, passing params.key (URL-only connectors)
// Stateless: a fresh server per request, so it scales like any route.
// Deps: @modelcontextprotocol/sdk (>=1.2x), zod
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateApiKey } from "@/server/services/apiKeys"; // from api-keys.ts (bind your store)
import { createMcpServer } from "@/server/mcp/server";
import { logToolCall } from "@/server/services/agentActivity";  // from audit-and-approvals.ts

export const maxDuration = 300;

export async function handleMcp(req: Request, keyInPath?: string) {
  const actor = await authenticateApiKey(req, keyInPath);
  if (!actor) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "Missing or invalid API key. Create one in Settings → AI assistant." }, id: null },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="myapp"' } },
    );
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  const server = await createMcpServer({ actor, baseUrl: new URL(req.url).origin, log: logToolCall, req });
  await server.connect(transport);
  return transport.handleRequest(req);
}

// src/app/api/mcp/route.ts
const handle = (req: Request) => handleMcp(req);
export { handle as GET, handle as POST, handle as DELETE };

// src/app/api/mcp/[key]/route.ts  (Next 15+: params is a Promise)
// export async function POST(req: Request, ctx: { params: Promise<{ key: string }> }) {
//   return handleMcp(req, (await ctx.params).key);
// }
// export { POST as GET, POST as DELETE };
