// TEMPLATE: need-based UI inside agents — an MCP Apps `ui://` card (L8).
// MCP Apps (Jan 2026, co-developed by Anthropic + OpenAI) lets a tool point at a
// `ui://` HTML resource the host renders in a sandboxed iframe (Claude, ChatGPT,
// VS Code, Goose). ⚠ The extension is new: check the current spec and SDK
// (`@modelcontextprotocol/ext-apps`, which offers registerAppTool/registerAppResource helpers)
// before shipping, and test in MCP Inspector + a real client.
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const CARD_URI = "ui://myapp/preview-card";
const MCP_APP_MIME = "text/html;profile=mcp-app";

// Self-contained HTML: inline CSS/JS, no external network unless declared in the resource's CSP metadata.
const CARD_HTML = /* html */ `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root{color-scheme:light dark;--bg:#fff;--fg:#111;--mut:#666;--acc:#2a78d6}
  @media (prefers-color-scheme:dark){:root{--bg:#1a1a19;--fg:#f0efec;--mut:#aaa}}
  body{margin:0;font:14px/1.45 system-ui,sans-serif;background:var(--bg);color:var(--fg)}
  .card{padding:16px;display:grid;gap:10px}
  .title{font-weight:650;font-size:16px}.meta{color:var(--mut)}
  img{max-width:100%;border-radius:8px}
  .row{display:flex;gap:8px}button{font:inherit;padding:8px 14px;border-radius:8px;border:1px solid var(--mut);background:transparent;color:var(--fg);cursor:pointer}
  button.primary{background:var(--acc);border-color:var(--acc);color:#fff}
</style></head><body><div class="card" id="app">Loading…</div>
<script>
  // Host bridge: JSON-RPC over postMessage. The host sends the tool result; the card may ask the host to call tools.
  let nextId = 1; const pending = new Map();
  function rpc(method, params){ const id = nextId++; parent.postMessage({jsonrpc:"2.0", id, method, params}, "*");
    return new Promise(r => pending.set(id, r)); }
  window.addEventListener("message", (e) => {
    const m = e.data || {};
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); return; }
    if (m.method === "ui/notifications/tool-result") render(m.params?.structuredContent || {});
  });
  function render(d){
    const el = document.getElementById("app");
    el.innerHTML = \`
      <div class="title">\${esc(d.name || "Preview")}</div>
      \${d.imageUrl ? \`<img alt="" src="\${esc(d.imageUrl)}">\` : ""}
      <div class="meta">\${esc(d.summary || "")}</div>
      \${d.pendingRef ? \`<div class="row"><button class="primary" id="ok">Approve</button><button id="no">Deny</button></div>\` : ""}\`;
    if (d.pendingRef) {
      // SECURITY: never let the card call an "approve" TOOL. A tools/call from the card arrives with the
      // agent's key, so the server can't tell a human click from the agent approving itself.
      // Instead open the app's approval page, where the human's own web session decides.
      document.getElementById("ok").onclick = () => rpc("ui/open-link", { url: d.approveUrl });
      document.getElementById("no").onclick = () => rpc("ui/open-link", { url: d.approveUrl + "?deny=1" });
    }
  }
  function esc(s){ return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  rpc("ui/initialize", { appInfo: { name: "myapp-preview", version: "1.0.0" } });
</script></body></html>`;

export function registerPreviewCard(server: McpServer, deps: { preview: (id: string) => Promise<{ name: string; imageUrl?: string; summary: string; pendingRef?: string; approveUrl?: string }> }) {
  server.registerResource(
    "preview-card",
    CARD_URI,
    { title: "Preview card", mimeType: MCP_APP_MIME },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: MCP_APP_MIME, text: CARD_HTML }] }),
  );

  server.registerTool(
    "preview_item",
    {
      title: "Preview item",
      description: "Show a visual preview the user can look at (and approve, if a publish is pending).",
      inputSchema: { item: z.string().describe("Item name or id") },
      _meta: { ui: { resourceUri: CARD_URI } }, // links this tool's result to the card
    },
    async ({ item }) => {
      const d = await deps.preview(item);
      return {
        // Text fallback for clients without MCP Apps:
        content: [{ type: "text", text: `${d.name}: ${d.summary}${d.imageUrl ? `\nPreview: ${d.imageUrl}` : ""}` }],
        structuredContent: d, // what the card renders
      };
    },
  );
}
