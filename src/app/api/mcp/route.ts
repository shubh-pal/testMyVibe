import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function extractToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const url = new URL(req.url);
  return url.searchParams.get("token");
}

async function handle(req: Request): Promise<Response> {
  const token = extractToken(req);
  if (!token) {
    return new Response(
      JSON.stringify({
        error: "Missing MCP token. Pass it as a Bearer token or ?token=",
      }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      },
    );
  }

  const project = await prisma.project.findUnique({
    where: { mcpToken: token },
  });
  if (!project) {
    return new Response(
      JSON.stringify({ error: "Invalid or revoked MCP token" }),
      {
        status: 401,
        headers: { "content-type": "application/json" },
      },
    );
  }

  // Stateless mode: a fresh server + transport per request. Cheap for SQLite-backed
  // tool calls and avoids needing sticky sessions across a serverless deployment.
  const server = createMcpServer(token);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export { handle as GET, handle as POST, handle as DELETE };
