#!/usr/bin/env node
// TEMPLATE: product CLI that drives the product's own MCP endpoint (L6).
// One source of truth: commands come from `tools/list`, so the CLI never drifts from the MCP server.
//
//   myapp key <key>                    save key (~/.config/myapp/config.json, 0600)
//   myapp tools                        list what this key can do
//   myapp <tool> [--arg value ...]     call a tool, e.g. `myapp list_items --status live`
//   myapp <tool> --json '{"a":1}'      pass arguments as JSON
//   add --raw for machine-readable JSON output (stable for agents/scripts)
//
// Env: MYAPP_TOKEN overrides the saved key; MYAPP_URL overrides the endpoint.
// Package: "bin": { "myapp": "cli.mjs" } in package.json → `npm i -g myapp`.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const APP = "myapp";
const CFG = path.join(os.homedir(), ".config", APP, "config.json");
const URL_ = process.env.MYAPP_URL || "https://myapp.com/api/mcp";

const readCfg = () => { try { return JSON.parse(fs.readFileSync(CFG, "utf8")); } catch { return {}; } };
const token = () => process.env.MYAPP_TOKEN || readCfg().token;

let rpcId = 0;
async function rpc(method, params) {
  const t = token();
  if (!t) throw new Error(`No key. Run: ${APP} key <key>  (get one in Settings → AI assistant)`);
  const res = await fetch(URL_, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${t}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
  });
  if (res.status === 401) throw new Error(`Key rejected. Run: ${APP} key <new key>`);
  const text = await res.text();
  // Streamable HTTP may answer as JSON or as one SSE event.
  const json = text.startsWith("{") ? JSON.parse(text) : JSON.parse(text.split("\n").find((l) => l.startsWith("data:"))?.slice(5) ?? "{}");
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

function parseArgs(argv) {
  const out = {}; let raw = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--raw") raw = true;
    else if (a === "--json") Object.assign(out, JSON.parse(argv[++i]));
    else if (a.startsWith("--")) {
      const k = a.slice(2).replace(/-/g, "_"); const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) out[k] = true;
      else { out[k] = /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v === "true" ? true : v === "false" ? false : v; i++; }
    }
  }
  return { args: out, raw };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log(`${APP}: use ${APP} from your terminal or scripts\n\n  ${APP} key <key>\n  ${APP} tools\n  ${APP} <tool> [--arg value] [--json '{...}'] [--raw]`);
    return;
  }
  if (cmd === "key") {
    fs.mkdirSync(path.dirname(CFG), { recursive: true });
    fs.writeFileSync(CFG, JSON.stringify({ ...readCfg(), token: rest[0] }, null, 2), { mode: 0o600 });
    console.log("✓ Key saved"); return;
  }
  await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: `${APP}-cli`, version: "0.0.1" } });
  if (cmd === "tools") {
    const { tools } = await rpc("tools/list", {});
    for (const t of tools) console.log(`${t.name.padEnd(24)} ${t.description?.split("\n")[0] ?? ""}`);
    return;
  }
  const { args, raw } = parseArgs(rest);
  const result = await rpc("tools/call", { name: cmd, arguments: args });
  if (raw) { console.log(JSON.stringify(result.structuredContent ?? result, null, 2)); }
  else for (const c of result.content ?? []) console.log(c.type === "text" ? c.text : `[${c.type}]`);
  if (result.isError) process.exitCode = 1;
}

main().catch((e) => { console.error(`✗ ${e.message}`); process.exitCode = 1; });
