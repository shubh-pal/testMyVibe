# Contributing

Use Node.js 22, install with npm ci, and follow the README to migrate your local SQLite database. Read AGENTS.md and the installed Next.js documentation before changing framework code.

Keep changes focused. Include a description of the behavior, relevant screenshots for UI changes, and the checks you ran. Add integration coverage when changing tenancy, authentication, MCP authorization, or issue state transitions. Run lint, build, and the integration suite before opening a pull request.

Never commit databases, environment secrets, project MCP tokens, or real audit data. Database changes must include a Prisma migration. Preserve existing user data and document upgrade steps.

Useful contributions include additional MCP client recipes, accessibility improvements, team memberships, account recovery, and reliable external scheduler examples. Discuss larger changes in an issue first.
