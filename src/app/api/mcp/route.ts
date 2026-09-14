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

  // Best-effort usage logging for the super-admin dashboard. Never blocks or
  // fails the actual MCP call — malformed/non-tool-call bodies are ignored.
  void logToolCalls(req.clone(), project.id);

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

async function logToolCalls(req: Request, projectId: string) {
  if (req.method !== "POST") return;
  try {
    const body = await req.json();
    const messages = Array.isArray(body) ? body : [body];
    const tools = messages
      .filter(
        (m) =>
          m && typeof m === "object" && m.method === "tools/call" &&
          typeof m.params?.name === "string",
      )
      .map((m) => ({ projectId, tool: m.params.name as string }));
    if (tools.length) await prisma.mcpEvent.createMany({ data: tools });
  } catch {
    // Not JSON, not a tool call, or logging failed — never affect the request.
  }
}

export { handle as GET, handle as POST, handle as DELETE };
