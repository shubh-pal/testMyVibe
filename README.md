# TestMyVibe

A self-hosted quality dashboard for AI-assisted development. Discover user journeys, audit source code, approve findings, and review agent-generated fixes. Uses standard MCP Streamable HTTP, with setup tabs for Claude Code, Cursor, VS Code, Codex, and other compatible clients.

## Local setup

Requires Node.js 20.19+ (Node 22 recommended) and npm.

```sh
npm ci
cp .env.example .env
# Edit .env: point DATABASE_URL (and DIRECT_URL, if pooled) at a Postgres
# database — e.g. a free Supabase project.
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Open http://localhost:3000, create an account and workspace, then name a project. Open **AI connection** in that project for client setup and the MCP diagnostic. Your AI agent audits the repository already open in its workspace; TestMyVibe does not collect a local path or repository URL and cannot read your files itself.

### Operate the live project from a local checkout

The app is database-backed, so a local server can operate the same live projects when it connects to the live Postgres database. Copy the live deployment's `DATABASE_URL` and `DIRECT_URL` into the local `.env`, run pending migrations before starting the app, and sign in with the existing live account:

```sh
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Use the same account email and password as the deployed app. Workspace and project access remains enforced by the signed-in user's workspace; pointing at the live database does not grant access to another workspace. Keep the live database credentials only in the local untracked `.env` file, and use a database backup or staging database for destructive experiments.

## Quality workflow

1. Connect your coding agent and ask it to call `get_project`.
2. Inventory application modules with `save_module_inventory`, then review each module for source-backed security, AI, reliability, data, cost, and performance risks.
3. Discover user flows; reuse existing flows on subsequent audits.
4. Audit each step against source and report concrete evidence.
5. Review findings on the issue board and approve or reject them.
6. Ask your agent to claim approved issues, make fixes, and submit resolutions.
7. Review the changes and mark them done, or send them back.

Audits are source inspections, not browser execution. The external agent performs all code reading, edits, and tests. The dashboard stores evidence and decisions.

## Scheduling

The AI connection page includes a copyable, tool-neutral scheduling prompt:

- Every hour: audit pending graph journeys and identify concrete source-backed issues.
- Every 30 minutes: claim and fix approved issues, then submit for human review.
- Separately, on a chosen cadence: discover pending user journeys and graph nodes.

TestMyVibe does **not** run a scheduler or execute your agent. A scheduling-capable AI tool or an external scheduler must create and run these jobs. Use the quality-loop prompt for audits and approved fixes, and create a separate discovery job from the graph-discovery prompt so discovery cannot be mistaken for completed auditing. The prompts include approval boundaries, no-overlap guidance, validation, and failure reporting. Confirm activation in the chosen scheduler.

## Accounts and tenancy

Each signup creates a separate private workspace. Sessions use random, hashed server-side tokens, HTTP-only SameSite cookies, and seven-day expiry. Passwords use salted scrypt. Every dashboard API checks the session and workspace ownership, including nested flow, run, issue, and aggregate queries. MCP bearer tokens are scoped to one project and can be rotated.

This release provides one workspace per account, not team invitations or role management. Account recovery and email verification are not implemented.

Existing projects are preserved during migration with no workspace assignment; they are never automatically given to the first signup. A trusted server administrator can assign a specific unowned project after the intended owner signs up:

```sh
node --env-file=.env scripts/assign-legacy-project.mjs PROJECT_ID EXISTING_USER_EMAIL
```

Existing MCP tokens continue to work until rotated. Back up the database before upgrading.

## Self-hosting

```sh
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

Set DATABASE_URL to a Postgres connection string (Supabase, Neon, RDS, self-hosted — anything Prisma's `postgresql` provider supports). `npm start` already runs `prisma migrate deploy` before `next start` (see `scripts/start.mjs`), so a fresh instance with an empty database migrates itself on boot. If your provider puts a transaction-mode pooler in front of Postgres (e.g. Supabase's Supavisor on port 6543), also set DIRECT_URL to a session-mode or direct connection (port 5432) — migrations need prepared-statement support the transaction pooler doesn't provide. Run behind HTTPS; production session cookies are Secure. Configure request size limits and authentication rate limiting at your reverse proxy before exposing signup to the public internet. Back up the database regularly.

Remote AI clients need a reachable HTTPS endpoint. A localhost URL works only from the same machine. MCP credentials grant project read/write access; store them in secret environment/configuration, never in commits. Query-string tokens are supported for legacy clients but bearer headers are preferred because URLs can be logged.

## Validation

With the development server running:

```sh
npm run lint
npm run build
npm run test:integration
```

The integration suite creates temporary accounts and projects, tests tenant isolation, authentication, input validation, cross-origin rejection, MCP approval gates and token rotation, then removes its own fixtures. Use TEST_BASE_URL to target another local test server; do not run it against production.

## Client references

Configuration shapes are based on the official [Cursor MCP docs](https://cursor.com/docs/context/mcp), [VS Code MCP docs](https://code.visualstudio.com/docs/agent-customization/mcp-servers), [Claude Code MCP docs](https://code.claude.com/docs/en/mcp), and [Codex MCP docs](https://developers.openai.com/codex/mcp). Client capabilities and scheduling support vary.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Licensed under the MIT license.
