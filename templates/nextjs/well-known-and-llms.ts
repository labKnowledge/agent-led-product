// TEMPLATE: agent discovery docs (L5).
//   src/app/.well-known/mcp/route.ts  → GET returns the server card below
//   src/app/llms.txt/route.ts         → GET returns text/plain (or put a static public/llms.txt)
// Keep both generated from the same TOOLS list the MCP server registers, so docs never drift.

const APP = { name: "MyApp", slug: "myapp", url: process.env.APP_URL ?? "https://myapp.com" };

// Import from your server module in real code; inlined here for the template.
const TOOLS: { name: string; description: string; scope: string; approval?: boolean }[] = [
  { name: "get_overview", description: "Today at a glance. Start here.", scope: "reports.view" },
  { name: "list_items", description: "Items with status and preview links.", scope: "items.view" },
  { name: "create_item", description: "Create a draft item.", scope: "items.edit" },
  { name: "publish_item", description: "Publish an item (owner approval).", scope: "items.publish", approval: true },
];

// ---- /.well-known/mcp ----
export function GET_wellKnown() {
  return Response.json(
    {
      name: APP.slug,
      title: APP.name,
      description: "One line: the outcome this product delivers.",
      endpoint: `${APP.url}/api/mcp`,
      transport: "streamable-http",
      auth: {
        type: "bearer",
        header: "Authorization: Bearer <key>",
        urlForm: `${APP.url}/api/mcp/<key>`,
        getKey: `${APP.url}/settings/ai`,
      },
      scopes: [...new Set(TOOLS.map((t) => t.scope))],
      tools: TOOLS,
      docs: `${APP.url}/llms.txt`,
    },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}

// ---- /llms.txt ----
export function GET_llms() {
  const body = `# ${APP.name}

> One-paragraph description: who it's for and the outcome it delivers.

## Use ${APP.name} from an AI agent
- MCP endpoint: ${APP.url}/api/mcp  (Streamable HTTP)
- Auth: \`Authorization: Bearer <key>\`, or put the key in the URL: ${APP.url}/api/mcp/<key>
- Get a key: ${APP.url}/settings/ai  (shown once; scoped to your permissions)
- Claude Code: \`claude mcp add --transport http ${APP.slug} ${APP.url}/api/mcp --header "Authorization: Bearer <key>"\`
- CLI: \`npm i -g ${APP.slug}\` then \`${APP.slug} key <key>\`

## Typical jobs (example prompts)
- "Show me what needs attention today" → get_overview
- "Draft a new item about X and show me a preview" → create_item
- "Publish it" → publish_item (waits for owner approval)

## Tools
${TOOLS.map((t) => `- ${t.name}: ${t.description}${t.approval ? " (requires owner approval)" : ""}`).join("\n")}

## Pricing
Actions cost credits; call get_pricing. Failed actions are not charged.

## Docs
- [API reference](${APP.url}/docs/api.md)
- [Agent skill (SKILL.md)](${APP.url}/downloads/${APP.slug}-skill.md)
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
