---
name: {{slug}}
description: Use {{Product}} through its MCP server or CLI to {{the outcomes, in user words}}. Use when the user mentions {{Product}}, {{domain nouns}}, or asks to {{top jobs}}.
---

# {{Product}}

{{One line: what it does and for whom.}}

## Connect (once)
- Key: {{url}}/settings/ai → Create key (shown once).
- MCP: `{{url}}/api/mcp` with `Authorization: Bearer <key>`, or `{{url}}/api/mcp/<key>` for URL-only connectors.
- CLI: `npm i -g {{slug}} && {{slug}} key <key>`

## Workflow
1. `get_overview`: always start here.
2. {{step}}
3. {{step}}. Publishing, sending, spending or deleting **waits for owner approval**. Tell the user and share the approve link.

## Rules
- Names or ids are accepted; on ambiguity, ask the user.
- Use `dryRun` / `get_pricing` before costly actions and state the cost.
- Never ask the user for passwords or keys in chat. Keys are created in Settings by a human.

## Gotchas
- {{domain-specific pitfalls the agent hit in testing}}
