# TestMyVibe

A test-case generator and audit tool for vibe-coded apps — but instead of running a browser,
it hands your own AI (Claude Code / Claude Desktop / any MCP client) an **MCP server** so it can
audit your codebase by actually reading it.

## How it works

1. Create a **Project** here, pointing at a codebase (local path and/or GitHub URL — these are just
   context shown to the connecting AI).
2. Copy the project's MCP server URL + Bearer token from the Connect panel and add it to Claude Code:
   ```bash
   claude mcp add --transport http testmyvibe http://localhost:3000/api/mcp --header "Authorization: Bearer <token>"
   ```
3. Ask Claude to audit the codebase. It will:
   - Discover user flows by reading routes/pages/components (e.g. "Home -> Login -> submit -> verified")
   - Register each flow via `create_flow`
   - Check every step against the real source (not by running anything) and call `report_step_result`
   - File concrete findings via `report_issue`, each with a **ready-to-paste fix prompt**
   - Wrap up with `finish_run`
4. Watch the audit build live on the dashboard, then copy fix prompts straight back into your coding
   session to actually fix the issues.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite (swap `DATABASE_URL` for Postgres in production)
- `@modelcontextprotocol/sdk` — Streamable HTTP MCP server at `/api/mcp`, stateless, one token per project

## Data model

`Project` → `Flow` → `Step` (plain-English description + expected outcome)
`Run` → `StepResult` (verified/missing/partial) + `Issue` (severity, category, description, fixPrompt, file/line)

## Local dev

```bash
npm install
npx prisma migrate dev
npm run dev
```
