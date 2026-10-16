#!/usr/bin/env python3
"""Agent-readiness scanner.

Single project:  scan.py <dir> [--out scan.json] [--md]
Portfolio:       scan.py <parent_dir> --portfolio [--out scan.json] [--md]

Emits, per project: language mix, last-modified date, signal hits with example
files, an action inventory (API routes / server actions / MCP tools / CLI
commands) and a PROVISIONAL 10-question score. Signals are hints: confirm each
question by reading the files listed under `evidence` before reporting.
"""
import argparse
import json
import os
import re
import sys
import time

SKIP_DIRS = {
    "node_modules", ".git", ".next", "dist", "build", ".venv", "venv", "env", "__pycache__",
    ".gradle", "Pods", ".turbo", "coverage", "out", "target", ".cache", "vendor", ".expo",
    ".svelte-kit", ".nuxt", ".output", "site-packages", ".idea", ".vscode", "tmp", "logs",
}
TEXT_EXT = {
    ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs", ".py", ".kt", ".java", ".go", ".rs", ".json",
    ".md", ".txt", ".toml", ".yaml", ".yml", ".php", ".rb", ".swift", ".dart", ".prisma", ".sql",
}
MAX_FILE = 400_000
MAX_FILES = 6000

SIG = {
    "mcp": r"@modelcontextprotocol|McpServer\b|FastMCP|mcp\.server|createMcpHandler|mcp-handler|registerTool\(|server\.tool\(|\"tools/list\"",
    "mcp_apps": r"ui://|text/html;profile=mcp-app|@modelcontextprotocol/ext-apps|registerAppTool|openai/outputTemplate|text/html\+skybridge|@mcp-ui/|a2ui",
    "cli": r"\"bin\"\s*:|from ['\"]commander['\"]|require\(['\"]commander['\"]\)|yargs|argparse|import typer|@click\.command|#!/usr/bin/env (node|python)|clikt|spf13/cobra",
    "api_versioned": r"/api/v\d|/v1/|APIRouter\(prefix=['\"]/v\d",
    "api_keys": r"(create|generate|issue|revoke|authenticate|verify)[_-]?api[_-]?key|(create|revoke)Key\b|collection\(['\"]api_keys|api_keys|\bApiKey(Schema|Model|Doc)?\b|\bMcpApiKey\b|ApiToken|createApiKey|authenticateApiKey|personal[_-]?access[_-]?token|apiKeyAuth|requireApiKey|validateApiKey",
    "scopes": r"scopes?\s*[:=]|allowedTools|permissions\s*[:=]|hasScope|requireScope|can\(",
    "openapi": r"openapi|swagger",
    "llms_txt": r"llms\.txt",
    "well_known_mcp": r"\.well-known/mcp",
    "agent_skill": r"SKILL\.md|AGENTS\.md",
    "billing": r"stripe|paddle|lemonsqueezy|flutterwave|paystack|braintree",
    "usage_pricing": r"(credit|usage)[_-]?(wallet|ledger|balance|record)|wallet\.balance|metered|usage[_-]?based|price[_-]?per[_-]?(call|action|request|outcome)|x402|debitCredits|chargeCredits|stripe.*usage_record|meter_event",
    "audit": r"audit[_-]?log|AuditLog|activity[_-]?log|ActivityLog|McpUsageLog|usage[_-]?log",
    "approval": r"approv(al|e)|pending[_-]?action|requireConfirm|confirm\s*:\s*z\.literal|dryRun|human[_-]?in[_-]?the[_-]?loop|review[_-]?lane",
    "llm": r"openai|anthropic|@google/genai|google\.generativeai|gemini|ollama|litert|langchain|llama",
    "webhook": r"webhook",
}
CODE_ONLY = {"mcp", "mcp_apps", "cli", "api_keys", "scopes", "billing", "usage_pricing", "audit", "approval", "llm", "webhook"}
SIG = {k: re.compile(v, re.I if k not in ("mcp", "cli", "api_keys") else 0) for k, v in SIG.items()}

ROUTE_PATTERNS = [
    ("nextjs-app", re.compile(r"app/(.*)/route\.(t|j)sx?$")),
    ("nextjs-pages", re.compile(r"pages/api/(.*)\.(t|j)sx?$")),
]
INLINE_ROUTES = [
    ("express", re.compile(r"\b(?:app|router)\.(get|post|put|patch|delete)\(\s*['\"`]([^'\"`]+)")),
    ("fastapi", re.compile(r"@(?:app|router)\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)")),
    ("flask", re.compile(r"@(?:app|bp|blueprint)\.route\(\s*['\"]([^'\"]+)['\"](?:.*methods=\[([^\]]+)\])?")),
    ("go", re.compile(r"\.(?:HandleFunc|Handle|GET|POST|PUT|PATCH|DELETE)\(\s*\"([^\"]+)\"")),
    ("hono", re.compile(r"\b(?:app|api)\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)")),
    ("trpc", re.compile(r"(\w+)\s*:\s*(?:publicProcedure|protectedProcedure|\w+Procedure)\b")),
]
MCP_TOOL = re.compile(r"(?:registerTool|server\.tool|\.tool)\(\s*['\"]([a-zA-Z0-9_\-\.]+)['\"]|@mcp\.tool\(\)\s*\n\s*(?:async\s+)?def\s+(\w+)")
# Low-level servers list tools as objects: { name: "x", description: ..., inputSchema: ... }
MCP_TOOL_OBJ = re.compile(r"name\s*:\s*['\"]([a-z][a-z0-9_]+)['\"]\s*,\s*(?:title\s*:[^\n]*\n\s*)?description\s*:[\s\S]{0,1500}?inputSchema", re.I)
SERVER_ACTION = re.compile(r"['\"]use server['\"]")
EXPORTED_FN = re.compile(r"export\s+(?:async\s+)?function\s+(\w+)")
NEXT_METHODS = re.compile(r"export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b")


def walk(root):
    count = 0
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP_DIRS and not d.startswith(".") or d == ".well-known"]
        for fn in fns:
            p = os.path.join(dp, fn)
            ext = os.path.splitext(fn)[1].lower()
            if ext not in TEXT_EXT and fn not in ("llms.txt", "SKILL.md", "AGENTS.md"):
                continue
            try:
                st = os.stat(p)
            except OSError:
                continue
            if st.st_size > MAX_FILE:
                continue
            count += 1
            if count > MAX_FILES:
                return
            yield p, st.st_mtime, ext


def scan_project(root):
    hits = {k: [] for k in SIG}
    langs, latest, files = {}, 0.0, 0
    actions = []
    mcp_tools = set()
    cli_bin = []
    special = {"llms.txt": False, "SKILL.md": False, "AGENTS.md": False, "openapi_file": False}
    for p, mt, ext in walk(root):
        files += 1
        latest = max(latest, mt)
        langs[ext] = langs.get(ext, 0) + 1
        rel = os.path.relpath(p, root)
        base = os.path.basename(p)
        if base in special:
            special[base] = True
        if re.search(r"openapi\.(json|ya?ml)$|swagger\.(json|ya?ml)$", base, re.I):
            special["openapi_file"] = True
        try:
            with open(p, "rb") as fh:
                raw = fh.read()
        except OSError:
            continue
        if b"\x00" in raw[:2048]:
            continue  # binary (e.g. MPEG-TS video segments named *.ts)
        txt = raw.decode("utf-8", errors="ignore")
        is_doc = ext in (".md", ".txt")
        in_scripts = "/scripts/" in "/" + rel.replace(os.sep, "/")
        is_lock = base in ("package-lock.json", "pnpm-lock.yaml", "yarn.lock", "poetry.lock", "go.sum")
        if not is_lock:
            for k, rx in SIG.items():
                if k in CODE_ONLY and is_doc:
                    continue
                if k == "cli" and in_scripts:
                    continue
                if rx.search(txt) and len(hits[k]) < 400:
                    hits[k].append(rel)
            if re.search(r"(^|/)(audit|audit[-_]?log|activity[-_]?log)\.(t|j)s$|(^|/)audit(_log)?\.py$", rel.replace(os.sep, "/"), re.I) and rel not in hits["audit"]:
                hits["audit"].append(rel)
            if base == "package.json" and re.search(r'"bin"\s*:', txt):
                cli_bin.append(rel)
        # action inventory
        for kind, rx in ROUTE_PATTERNS:
            m = rx.search(rel.replace(os.sep, "/"))
            if m:
                methods = NEXT_METHODS.findall(txt) or ["?"]
                actions.append({"kind": kind, "route": "/" + m.group(1), "methods": sorted(set(methods)), "file": rel})
        if ext in (".js", ".ts", ".mjs", ".cjs", ".py", ".go", ".tsx", ".jsx"):
            for kind, rx in INLINE_ROUTES:
                for m in rx.finditer(txt):
                    g = m.groups()
                    if kind == "trpc":
                        actions.append({"kind": kind, "route": g[0], "methods": ["proc"], "file": rel})
                    elif kind == "flask":
                        actions.append({"kind": kind, "route": g[0], "methods": [g[1] or "GET"], "file": rel})
                    elif kind == "go":
                        actions.append({"kind": kind, "route": g[0], "methods": ["?"], "file": rel})
                    else:
                        actions.append({"kind": kind, "route": g[1], "methods": [g[0].upper()], "file": rel})
            if SERVER_ACTION.search(txt[:200]):
                for fn in EXPORTED_FN.findall(txt):
                    actions.append({"kind": "server-action", "route": fn, "methods": ["action"], "file": rel})
            if SIG["mcp"].search(txt) or "inputSchema" in txt:
                for m in MCP_TOOL_OBJ.finditer(txt):
                    mcp_tools.add(m.group(1))
            for m in MCP_TOOL.finditer(txt):
                name = m.group(1) or m.group(2)
                if name and name not in ("name", "tool"):
                    mcp_tools.add(name)
    # dedupe actions
    seen, uniq = set(), []
    for a in actions:
        key = (a["kind"], a["route"], tuple(a["methods"]))
        if key not in seen:
            seen.add(key)
            uniq.append(a)
    top_langs = [k for k, _ in sorted(langs.items(), key=lambda x: -x[1])[:4]]
    readme = ""
    for n in ("README.md", "readme.md", "CLAUDE.md", "AGENTS.md"):
        rp = os.path.join(root, n)
        if os.path.exists(rp):
            readme = open(rp, encoding="utf-8", errors="ignore").read()[:700].replace("\n", " ")
            break
    res = {
        "project": os.path.basename(os.path.abspath(root)),
        "path": os.path.abspath(root),
        "files": files,
        "last_modified": time.strftime("%Y-%m-%d", time.localtime(latest)) if latest else None,
        "languages": top_langs,
        "readme": readme,
        "special_files": special,
        "signals": {k: {"count": len(v), "examples": v[:6]} for k, v in hits.items()},
        "mcp_tools": sorted(mcp_tools),
        "cli_bin": cli_bin,
        "actions": uniq[:600],
        "action_count": len(uniq),
    }
    res["provisional"] = provisional_score(res)
    return res


def provisional_score(r):
    s = r["signals"]
    c = lambda k: s[k]["count"]
    sp = r["special_files"]
    q = {}
    tools = len(r["mcp_tools"])
    q["Q1_api_mcp"] = 1 if (c("mcp") and tools >= 5) else (0.5 if c("mcp") or c("api_versioned") or r["action_count"] > 10 else 0)
    q["Q2_cli"] = 1 if r.get("cli_bin") else (0.5 if c("cli") else 0)
    q["Q3_agent_docs"] = 1 if (sp["llms.txt"] or (sp["openapi_file"] or c("openapi"))) and (sp["SKILL.md"] or sp["AGENTS.md"] or c("well_known_mcp")) else (0.5 if sp["llms.txt"] or sp["openapi_file"] or c("openapi") or c("well_known_mcp") or sp["AGENTS.md"] else 0)
    q["Q4_scoped_keys"] = 1 if (c("api_keys") and c("scopes")) else (0.5 if c("api_keys") else 0)
    q["Q5_action_pricing"] = 1 if (c("billing") and c("usage_pricing") >= 3) else (0.5 if c("billing") else 0)
    q["Q6_proprietary_data"] = None  # judgment: read the data model
    q["Q7_sells_outcome"] = None     # judgment: read README / pricing / marketing copy
    q["Q8_audit_approval"] = 1 if (c("audit") and c("approval")) else (0.5 if c("audit") or c("approval") else 0)
    q["Q9_ui_in_agents"] = 1 if c("mcp_apps") >= 2 else (0.5 if c("mcp_apps") else 0)
    q["Q10_model_resilient"] = None  # judgment
    known = sum(v for v in q.values() if v is not None)
    return {"questions": q, "known_points": known, "judgment_needed": [k for k, v in q.items() if v is None],
            "note": "Provisional. Confirm every question by reading the evidence files; fill Q6, Q7, Q10 by judgment."}


def to_md(results):
    out = []
    keys = ["Q1_api_mcp", "Q2_cli", "Q3_agent_docs", "Q4_scoped_keys", "Q5_action_pricing", "Q8_audit_approval", "Q9_ui_in_agents"]
    out.append("| project | files | last mod | MCP tools | actions | " + " | ".join(k.split("_", 1)[0] for k in keys) + " | known pts (of 7) |")
    out.append("|---" * (6 + len(keys)) + "|")
    for r in sorted(results, key=lambda r: -r["provisional"]["known_points"]):
        q = r["provisional"]["questions"]
        out.append(f"| {r['project']} | {r['files']} | {r['last_modified']} | {len(r['mcp_tools'])} | {r['action_count']} | "
                   + " | ".join(str(q[k]) for k in keys) + f" | {r['provisional']['known_points']} |")
    out.append("\nQ6 data moat, Q7 outcome, Q10 model resilience need judgment. Signals are hints: read the evidence files.")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--portfolio", action="store_true", help="treat each subfolder as a project")
    ap.add_argument("--out", default=None)
    ap.add_argument("--md", action="store_true", help="print a markdown summary table")
    a = ap.parse_args()
    root = os.path.abspath(a.path)
    if a.portfolio:
        results = []
        for name in sorted(os.listdir(root)):
            p = os.path.join(root, name)
            if os.path.isdir(p) and not name.startswith((".", "_")) and name not in SKIP_DIRS:
                print(f"scanning {name}…", file=sys.stderr)
                results.append(scan_project(p))
    else:
        results = [scan_project(root)]
    if a.out:
        with open(a.out, "w") as f:
            json.dump(results if a.portfolio else results[0], f, indent=1)
        print(f"wrote {a.out}", file=sys.stderr)
    if a.md or not a.out:
        print(to_md(results))
        if not a.portfolio:
            r = results[0]
            print(f"\nMCP tools ({len(r['mcp_tools'])}): {', '.join(r['mcp_tools'][:60])}")
            print(f"Actions found: {r['action_count']} (first 25):")
            for x in r["actions"][:25]:
                print(f"  {x['kind']:<14} {','.join(x['methods']):<12} {x['route']}  ({x['file']})")


if __name__ == "__main__":
    main()
