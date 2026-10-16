#!/usr/bin/env node
// MCP endpoint smoke test (Mode 5 / L3 acceptance).
//   node mcp_smoke.mjs <mcp_url> [--key-env VAR] [--call tool --args '{"a":1}']
// Checks: unauthenticated request is refused · initialize · tools/list · every tool has
// a description + input schema · optional single tools/call. Never prints the key.
const argv = process.argv.slice(2);
const url = argv[0];
if (!url) { console.error("usage: mcp_smoke.mjs <mcp_url> [--key-env VAR] [--call tool --args JSON]"); process.exit(2); }
const opt = (n) => { const i = argv.indexOf(n); return i > -1 ? argv[i + 1] : undefined; };
const keyEnv = opt("--key-env");
const key = keyEnv ? process.env[keyEnv] : undefined;
const callTool = opt("--call");
const callArgs = opt("--args") ? JSON.parse(opt("--args")) : {};

let id = 0;
async function rpc(method, params, withKey = true) {
  const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
  if (withKey && key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) });
  const text = await res.text();
  let json = null;
  try { json = text.trim().startsWith("{") ? JSON.parse(text) : JSON.parse(text.split("\n").find((l) => l.startsWith("data:"))?.slice(5) ?? "null"); } catch { /* keep null */ }
  return { status: res.status, json };
}

const results = [];
const check = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(`${pass ? "✓" : "✗"} ${name}${detail ? `: ${detail}` : ""}`); };

const init = { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "agent-led-smoke", version: "1.0.0" } };

if (key) {
  const anon = await rpc("initialize", init, false);
  check("unauthenticated request refused", anon.status === 401 || anon.status === 403 || !!anon.json?.error, `HTTP ${anon.status}`);
}
const r1 = await rpc("initialize", init);
check("initialize", r1.status < 400 && !!r1.json?.result, `HTTP ${r1.status} server=${r1.json?.result?.serverInfo?.name ?? "?"}`);
const instr = r1.json?.result?.instructions;
check("server instructions present", !!instr && instr.length > 40, instr ? `${instr.length} chars` : "missing: agents won't know the workflow");

const r2 = await rpc("tools/list", {});
const tools = r2.json?.result?.tools ?? [];
check("tools/list", tools.length > 0, `${tools.length} tools`);
const noDesc = tools.filter((t) => !t.description || t.description.length < 15).map((t) => t.name);
check("every tool has a useful description", noDesc.length === 0, noDesc.length ? `weak: ${noDesc.join(", ")}` : "");
const badName = tools.filter((t) => !/^[a-z][a-z0-9_]*$/.test(t.name)).map((t) => t.name);
check("snake_case verb_noun names", badName.length === 0, badName.join(", "));
const noSchema = tools.filter((t) => !t.inputSchema).map((t) => t.name);
check("every tool has an input schema", noSchema.length === 0, noSchema.join(", "));
const destructive = tools.filter((t) => /^(delete|remove|publish|send|pay|refund|go_live|submit|charge)/.test(t.name));
const ungated = destructive.filter((t) => !JSON.stringify(t.inputSchema ?? {}).match(/confirm|dryRun|dry_run/) && !/approv/i.test(t.description ?? "")).map((t) => t.name);
check("destructive tools gated (confirm/dryRun/approval)", ungated.length === 0, ungated.length ? `review: ${ungated.join(", ")}` : `${destructive.length} checked`);
const apps = tools.filter((t) => t._meta?.ui?.resourceUri || t._meta?.["openai/outputTemplate"]).map((t) => t.name);
console.log(`ℹ MCP Apps UI tools: ${apps.length ? apps.join(", ") : "none"}`);

if (callTool) {
  const r3 = await rpc("tools/call", { name: callTool, arguments: callArgs });
  const res = r3.json?.result;
  check(`tools/call ${callTool}`, !!res && !res.isError, res?.content?.[0]?.text?.slice(0, 160) ?? JSON.stringify(r3.json?.error ?? {}));
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exitCode = failed ? 1 : 0;
