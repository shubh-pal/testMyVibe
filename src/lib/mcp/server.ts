import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const AUDIT_PLAYBOOK = `You are auditing a real codebase for TestMyVibe. Nothing here runs in a browser —
you verify everything by reading the actual source code (routes, pages, components, API handlers).

Workflow:
1. Call get_project to see the repo location (local path and/or GitHub URL) and any existing flows.
2. Discover user flows by reading the codebase: look at routes/pages, nav components, and forms to
   figure out journeys a real user would take (e.g. "Home -> Login", "Cart -> Checkout", "Settings -> Change password").
   For each discovered flow, call create_flow with an ordered list of plain-English steps
   (each with a short "description" and, where relevant, an "expectedOutcome").
3. Call start_run for the flow you're about to audit.
4. For EACH step in the flow, actually check the code (grep for the relevant link/route/handler,
   read the component, check that a real API call exists and is wired up, check validation and
   error states) and call report_step_result with status "verified" | "missing" | "partial", plus
   short notes on what you found (file paths help).
5. Whenever a step reveals a real gap or bug — e.g. no link/button to get from one page to the next,
   a form with no validation, a submit handler that doesn't call a real API, a missing error state,
   an unauthenticated route that should be protected — call report_issue with:
     - severity: critical | high | medium | low
     - category: missing-navigation | broken-link | validation | error-handling | auth | api-mismatch | accessibility | other
     - title: short summary
     - description: what's wrong and where
     - fixPrompt: a ready-to-paste instruction for a coding agent to fix exactly this, referencing
       the file(s) involved
     - filePath / lineStart: if you know them
     - stepOrder: which step (by order number) this relates to
6. When you've gone through every step, call finish_run with status "passed" (no issues) or "failed"
   (one or more issues found), and a one-line summary.
7. Repeat discovery + audit for other flows worth checking (signup, password reset, checkout, etc.)
   until you've covered the app's main journeys, or the user says to stop.

Be concrete: every issue must point at real code, and every fixPrompt must be something a coding
agent could act on without re-discovering the bug itself.`;

async function getProjectForToken(token: string) {
  const project = await prisma.project.findUnique({ where: { mcpToken: token } });
  if (!project) throw new Error("Invalid or revoked MCP token for this project");
  return project;
}

export function createMcpServer(token: string) {
  const server = new McpServer({ name: "testmyvibe", version: "0.1.0" });

  server.registerTool(
    "get_project",
    {
      title: "Get project info",
      description:
        "Get the audited project's context (repo location, existing flows) and the audit playbook. Call this first.",
      inputSchema: {},
    },
    async () => {
      const project = await getProjectForToken(token);
      const flows = await prisma.flow.findMany({
        where: { projectId: project.id },
        include: { steps: { orderBy: { order: "asc" } }, _count: { select: { runs: true } } },
        orderBy: { createdAt: "asc" },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                playbook: AUDIT_PLAYBOOK,
                project: { id: project.id, name: project.name, repoPath: project.repoPath, repoUrl: project.repoUrl },
                existingFlows: flows.map((f) => ({
                  id: f.id,
                  name: f.name,
                  description: f.description,
                  source: f.source,
                  runCount: f._count.runs,
                  steps: f.steps.map((s) => ({ order: s.order, description: s.description, expectedOutcome: s.expectedOutcome })),
                })),
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "create_flow",
    {
      title: "Create a flow",
      description:
        "Register a user flow you discovered in the codebase (or one the user described), with its ordered plain-English steps.",
      inputSchema: {
        name: z.string().describe('Short flow name, e.g. "Login" or "Checkout"'),
        description: z.string().optional().describe("One-line description of the journey"),
        source: z.enum(["manual", "ai-discovered"]).default("ai-discovered"),
        steps: z
          .array(
            z.object({
              order: z.number().int().min(0),
              description: z.string().describe("Plain-English description of this step"),
              expectedOutcome: z.string().optional().describe("What should be true in the code if this step works"),
            })
          )
          .min(1),
      },
    },
    async ({ name, description, source, steps }) => {
      const project = await getProjectForToken(token);
      const flow = await prisma.flow.create({
        data: {
          projectId: project.id,
          name,
          description: description ?? null,
          source: source ?? "ai-discovered",
          steps: { create: steps.map((s) => ({ order: s.order, description: s.description, expectedOutcome: s.expectedOutcome ?? null })) },
        },
        include: { steps: { orderBy: { order: "asc" } } },
      });
      return { content: [{ type: "text", text: JSON.stringify({ flowId: flow.id, steps: flow.steps }, null, 2) }] };
    }
  );

  server.registerTool(
    "start_run",
    {
      title: "Start an audit run",
      description: "Begin a new audit run for a flow. Returns a runId to use with report_step_result, report_issue, and finish_run.",
      inputSchema: { flowId: z.string() },
    },
    async ({ flowId }) => {
      const project = await getProjectForToken(token);
      const flow = await prisma.flow.findFirst({ where: { id: flowId, projectId: project.id } });
      if (!flow) throw new Error("Flow not found for this project");
      const run = await prisma.run.create({ data: { flowId, status: "running" } });
      return { content: [{ type: "text", text: JSON.stringify({ runId: run.id }) }] };
    }
  );

  server.registerTool(
    "report_step_result",
    {
      title: "Report a step's audit result",
      description: "Record what you found for one step of the flow after checking the code.",
      inputSchema: {
        runId: z.string(),
        order: z.number().int().min(0),
        description: z.string(),
        status: z.enum(["verified", "missing", "partial"]),
        notes: z.string().optional().describe("What you found in the code, e.g. file references and reasoning"),
      },
    },
    async ({ runId, order, description, status, notes }) => {
      await requireRunForToken(runId, token);
      const result = await prisma.stepResult.create({ data: { runId, order, description, status, notes: notes ?? null } });
      return { content: [{ type: "text", text: JSON.stringify({ stepResultId: result.id }) }] };
    }
  );

  server.registerTool(
    "report_issue",
    {
      title: "Report an audit issue",
      description: "Report a concrete bug/gap you found in the code, with a ready-to-paste fix prompt for a coding agent.",
      inputSchema: {
        runId: z.string(),
        severity: z.enum(["critical", "high", "medium", "low"]),
        category: z.enum([
          "missing-navigation",
          "broken-link",
          "validation",
          "error-handling",
          "auth",
          "api-mismatch",
          "accessibility",
          "other",
        ]),
        title: z.string(),
        description: z.string(),
        fixPrompt: z.string().describe("Ready-to-paste instruction for a coding agent to fix this exact issue"),
        filePath: z.string().optional(),
        lineStart: z.number().int().optional(),
        stepOrder: z.number().int().optional(),
      },
    },
    async (input) => {
      await requireRunForToken(input.runId, token);
      const issue = await prisma.issue.create({
        data: {
          runId: input.runId,
          severity: input.severity,
          category: input.category,
          title: input.title,
          description: input.description,
          fixPrompt: input.fixPrompt,
          filePath: input.filePath ?? null,
          lineStart: input.lineStart ?? null,
          stepOrder: input.stepOrder ?? null,
        },
      });
      return { content: [{ type: "text", text: JSON.stringify({ issueId: issue.id }) }] };
    }
  );

  server.registerTool(
    "finish_run",
    {
      title: "Finish an audit run",
      description: "Mark an audit run finished once every step has been checked.",
      inputSchema: {
        runId: z.string(),
        status: z.enum(["passed", "failed"]),
        summary: z.string().optional().describe("One-line summary of the audit outcome"),
      },
    },
    async ({ runId, status, summary }) => {
      await requireRunForToken(runId, token);
      const [issueCount, stepResults] = await Promise.all([
        prisma.issue.count({ where: { runId } }),
        prisma.stepResult.findMany({ where: { runId } }),
      ]);
      await prisma.run.update({
        where: { id: runId },
        data: {
          status,
          finishedAt: new Date(),
          summary: JSON.stringify({
            note: summary ?? null,
            totalSteps: stepResults.length,
            verifiedSteps: stepResults.filter((s) => s.status === "verified").length,
            issueCount,
          }),
        },
      });
      return { content: [{ type: "text", text: JSON.stringify({ ok: true }) }] };
    }
  );

  return server;
}

async function requireRunForToken(runId: string, token: string) {
  const run = await prisma.run.findUnique({ where: { id: runId }, include: { flow: true } });
  if (!run) throw new Error("Run not found");
  const project = await prisma.project.findUnique({ where: { id: run.flow.projectId } });
  if (!project || project.mcpToken !== token) throw new Error("This run does not belong to the authenticated project");
  return run;
}
