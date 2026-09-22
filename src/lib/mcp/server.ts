import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  claimAudit,
  graphBatch,
  saveGraphBatch,
  setupGraph,
} from "@/lib/graph";

function issueFingerprint(parts: {
  source: "planned" | "module-review";
  moduleId?: string | null;
  category: string;
  title: string;
  filePath?: string | null;
}) {
  const normalized = [
    parts.source,
    parts.moduleId ?? "",
    parts.category.trim().toLowerCase(),
    parts.title.trim().toLowerCase().replace(/\s+/g, " "),
    parts.filePath?.trim().toLowerCase() ?? "",
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex");
}

const AUDIT_PLAYBOOK = `You are auditing a real codebase for TestMyVibe. Nothing here runs in a browser —
you verify everything by reading the actual source code (routes, pages, components, API handlers).

Workflow:
1. Call get_project, then call list_feature_graph_modules. First inventory the application modules. Reconcile every
   feature-graph group and node with the repository structure; use graph:<node-key> alongside code references in
   sourceRefs for each module it covers. Inspect repository entry points, package boundaries,
   backend services, API clients, AI/provider integrations, persistence, auth, queues/jobs, and important UI domains.
   Call save_module_inventory with stable module names, short descriptions, module kinds, source references, and the
   current Git revision. Do not invent modules; every module must have source evidence.
2. Call claim_next_module_review and inspect each claimed module's real source code. Look for plausible, source-backed
   risks in security/privacy, auth, prompt or tool injection, provider/API-key handling, model configuration, data
   leakage, tenant isolation, reliability/fallbacks, retries/timeouts, validation, cost/rate limits, hallucination,
   observability, and performance. Report each risk with report_module_risk, including evidence, confidence, affected
   files, and a complete fixPrompt. Do not re-report an existing equivalent risk. If a module has no plausible risk,
   call complete_module_review with that result.
3. Before auditing flows, repeatedly call claim_next_planning_issue for manually created requests.
   For each claimed request, inspect the actual repository source and use submit_issue_plan to save a concise plan
   plus independently executable subtasks. Each subtask needs a real file path where possible, acceptance criteria,
   and a complete coding-agent prompt. Never fix code in planning mode. Subtasks are approval-gated unless the
   request's auto-approve option was enabled.
4. Read the current Git commit SHA and committed date from the repository already open in your
   workspace. Call setup_project with currentRevision and currentRevisionAt. Follow nextAction exactly.
5. If nextAction is "audit_pending", call claim_next_audit and audit the claimed journey. Keep claiming pending
   journeys until the queue is empty or the run's time budget is nearly exhausted. Never re-audit verified journeys.
3. If nextAction is "up_to_date", stop quietly. The last completely audited commit is already the current commit.
4. If nextAction is "discover_changes", inspect only changes between lastAuditedRevision and currentRevision. If it is
   "continue_discovery", resume at the returned frontier and repair any returned uncoveredNodeKeys by connecting those
   nodes to source-evidenced journeys. Save a bounded batch with current commit SHA and date.
   Assign user-visible nodes to stable product features, keep labels user-facing, and connections directional.
   Only include changed graph elements so unaffected verified journeys stay verified. Create journeys only when new,
   or update a journey when its path changed. This is source inspection, never browser testing.
5. After discovery creates pending or stale journeys, claim and audit them before doing more discovery.
6. For EACH step in the flow, actually check the code (grep for the relevant link/route/handler,
   read the component, check that a real API call exists and is wired up, check validation and
   error states) and call report_step_result with status "verified" | "missing" | "partial", plus
   short notes on what you found (file paths help).
7. Whenever a step reveals a real gap or bug — e.g. no link/button to get from one page to the next,
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
8. When you've gone through every step, call finish_run with status "passed" (no issues) or "failed"
   (one or more issues found), and a one-line summary.

Be concrete: every issue must point at real code, and every fixPrompt must be something a coding
agent could act on without re-discovering the bug itself.

Issues start as "pending" for human review unless the project has autoApproveIssues enabled; then they start as "approved". You never fix an issue right after reporting it in the same breath;
fixing happens in a separate FIX MODE, only for approved issues.

FIX MODE — when the user asks you to "work through approved issues", "pick up the queue", etc.:
1. Call claim_next_issue. It atomically claims the oldest "approved" issue for this project and
   moves it to "in_progress" so no one else picks it up twice. If it returns none, there's nothing
   approved to work on right now — stop and say so.
2. Actually make the fix in the codebase using the returned fixPrompt/description/filePath as your
   starting point — read the surrounding code first, don't apply the prompt blindly.
3. Call submit_issue_resolution with what you changed (files touched, a short summary). This moves
   the issue to "in_review" for human confirmation, or "done" when the project has autoCloseIssues enabled.
4. Loop back to step 1 for the next approved issue, until claim_next_issue returns none or the user
   says to stop.`;

async function getProjectForToken(token: string) {
  const project = await prisma.project.findUnique({
    where: { mcpToken: token },
  });
  if (!project)
    throw new Error("Invalid or revoked MCP token for this project");
  return project;
}

export function createMcpServer(token: string) {
  const server = new McpServer({ name: "testmyvibe", version: "0.1.0" });

  server.registerTool(
    "get_project",
    {
      title: "Get project info",
      description:
        "Get the project's existing flows, module reviews, and audit playbook. Call this first; then list feature-graph modules before inspecting the repository.",
      inputSchema: {},
    },
    async () => {
      const project = await getProjectForToken(token);
      const [flows, manualRequests, modules] = await Promise.all([
        prisma.flow.findMany({
        where: { projectId: project.id },
        include: {
          steps: { orderBy: { order: "asc" } },
          _count: { select: { runs: true } },
        },
        orderBy: { createdAt: "asc" },
        }),
        prisma.issue.findMany({
          where: { projectId: project.id, issueType: "request", planningStatus: { in: ["unplanned", "planning"] } },
          orderBy: { createdAt: "asc" },
          select: { id: true, title: true, description: true, status: true, planningStatus: true, autoApprove: true },
        }),
        prisma.applicationModule.findMany({
          where: { projectId: project.id },
          orderBy: { name: "asc" },
          select: { id: true, name: true, kind: true, description: true, sourceRefs: true, revision: true, reviewStatus: true, reviewSummary: true, reviewedAt: true },
        }),
      ]);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                playbook: AUDIT_PLAYBOOK,
                project: {
                  id: project.id,
                  name: project.name,
                  autoApproveIssues: project.autoApproveIssues,
                  autoCloseIssues: project.autoCloseIssues,
                },
                manualRequests,
                applicationModules: modules.map((module) => ({
                  ...module,
                  sourceRefs: JSON.parse(module.sourceRefs),
                })),
                existingFlows: flows.map((f) => ({
                  id: f.id,
                  name: f.name,
                  description: f.description,
                  source: f.source,
                  runCount: f._count.runs,
                  steps: f.steps.map((s) => ({
                    order: s.order,
                    description: s.description,
                    expectedOutcome: s.expectedOutcome,
                  })),
                })),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "list_feature_graph_modules",
    {
      title: "List modules represented by the feature graph",
      description:
        "Return every feature-graph group and node for this project. Use this as the required coverage checklist when creating the application module inventory.",
      inputSchema: {},
    },
    async () => {
      const project = await getProjectForToken(token);
      const nodes = await prisma.graphNode.findMany({
        where: { projectId: project.id },
        orderBy: [{ group: "asc" }, { label: "asc" }],
        select: { key: true, label: true, kind: true, group: true, sourceRefs: true, revision: true },
      });
      const groups = new Map<string, typeof nodes>();
      for (const node of nodes) {
        const group = groups.get(node.group) ?? [];
        group.push(node);
        groups.set(node.group, group);
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            featureGraphModuleCount: groups.size,
            featureGraphNodeCount: nodes.length,
            modules: [...groups.entries()].map(([name, groupNodes]) => ({
              name,
              nodes: groupNodes.map((node) => ({
                key: node.key,
                label: node.label,
                kind: node.kind,
                sourceRefs: JSON.parse(node.sourceRefs),
                revision: node.revision,
              })),
            })),
          }, null, 2),
        }],
      };
    },
  );

  server.registerTool(
    "save_module_inventory",
    {
      title: "Save the application module inventory",
      description:
        "Persist a source-evidenced inventory of the application's modules before risk review. Reconcile every feature-graph module/node first, and include covered graph nodes as graph:<node-key> source references.",
      inputSchema: {
        revision: z.string().trim().min(1).max(200).optional(),
        modules: z.array(z.object({
          name: z.string().trim().min(1).max(160),
          kind: z.string().trim().min(1).max(80).default("application"),
          description: z.string().trim().max(2000).optional(),
          sourceRefs: z.array(z.string().trim().min(1).max(500)).min(1).max(50),
        })).min(1).max(200),
      },
    },
    async ({ revision, modules }) => {
      const project = await getProjectForToken(token);
      const saved = [];
      for (const module of modules) {
        const sourceRefs = JSON.stringify([...new Set(module.sourceRefs)].sort());
        const existing = await prisma.applicationModule.findUnique({
          where: { projectId_name: { projectId: project.id, name: module.name } },
        });
        const changed = !existing ||
          existing.revision !== (revision ?? null) ||
          existing.kind !== module.kind ||
          existing.description !== (module.description ?? null) ||
          existing.sourceRefs !== sourceRefs;
        saved.push(existing
          ? await prisma.applicationModule.update({
              where: { id: existing.id },
              data: {
                kind: module.kind,
                description: module.description ?? null,
                sourceRefs,
                revision: revision ?? null,
                ...(changed ? {
                  reviewStatus: "pending",
                  leaseUntil: null,
                  reviewedAt: null,
                  reviewSummary: null,
                } : {}),
              },
            })
          : await prisma.applicationModule.create({
              data: {
                projectId: project.id,
                name: module.name,
                kind: module.kind,
                description: module.description ?? null,
                sourceRefs,
                revision: revision ?? null,
              },
            }));
      }
      return { content: [{ type: "text", text: JSON.stringify({ ok: true, moduleCount: saved.length, modules: saved.map((m) => ({ id: m.id, name: m.name, reviewStatus: m.reviewStatus })) }) }] };
    },
  );

  server.registerTool(
    "claim_next_module_review",
    {
      title: "Claim the next application module for risk review",
      description:
        "Atomically claim one pending module review. Inspect its source code and report plausible source-backed risks, or complete the review when none are found.",
      inputSchema: {},
    },
    async () => {
      const project = await getProjectForToken(token);
      const now = new Date();
      const next = await prisma.applicationModule.findFirst({
        where: {
          projectId: project.id,
          OR: [{ reviewStatus: "pending" }, { reviewStatus: "in_progress", leaseUntil: { lt: now } }],
        },
        orderBy: { updatedAt: "asc" },
      });
      if (!next) return { content: [{ type: "text", text: JSON.stringify({ module: null }) }] };
      const leaseUntil = new Date(Date.now() + 15 * 60_000);
      const claimed = await prisma.applicationModule.updateMany({
        where: { id: next.id, reviewStatus: next.reviewStatus, ...(next.reviewStatus === "in_progress" ? { leaseUntil: { lt: now } } : {}) },
        data: { reviewStatus: "in_progress", leaseUntil },
      });
      if (!claimed.count) return { content: [{ type: "text", text: JSON.stringify({ module: null, note: "contention, try again" }) }] };
      return { content: [{ type: "text", text: JSON.stringify({ module: { id: next.id, name: next.name, kind: next.kind, description: next.description, sourceRefs: JSON.parse(next.sourceRefs), revision: next.revision }, leaseUntil }, null, 2) }] };
    },
  );

  server.registerTool(
    "report_module_risk",
    {
      title: "Report a risk found in an application module",
      description:
        "Create an approval-gated issue for a plausible, source-backed module risk. Do not report generic AI concerns without evidence in this repository.",
      inputSchema: {
        moduleId: z.string(),
        severity: z.enum(["critical", "high", "medium", "low"]),
        category: z.enum(["security", "privacy", "auth", "ai-safety", "data-integrity", "reliability", "performance", "cost", "observability", "other"]),
        confidence: z.enum(["confirmed", "likely", "plausible"]),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().min(1).max(12000),
        evidence: z.string().trim().min(1).max(12000),
        fixPrompt: z.string().trim().min(1).max(30000),
        filePath: z.string().trim().max(500).optional(),
        lineStart: z.number().int().optional(),
      },
    },
    async (input) => {
      const project = await getProjectForToken(token);
      const module = await prisma.applicationModule.findFirst({ where: { id: input.moduleId, projectId: project.id } });
      if (!module) throw new Error("Module not found for this project");
      if (module.reviewStatus !== "in_progress") throw new Error("Claim the module before reporting risks");
      const fingerprint = issueFingerprint({
        source: "module-review",
        moduleId: module.id,
        category: input.category,
        title: input.title,
        filePath: input.filePath,
      });
      const existing = await prisma.issue.findUnique({
        where: { projectId_fingerprint: { projectId: project.id, fingerprint } },
      });
      const issue = existing ?? await prisma.issue.create({
        data: {
          projectId: project.id,
          moduleId: module.id,
          severity: input.severity,
          category: input.category,
          title: input.title,
          description: `${input.description}\n\nEvidence: ${input.evidence}`,
          fixPrompt: input.fixPrompt,
          filePath: input.filePath ?? null,
          lineStart: input.lineStart ?? null,
          confidence: input.confidence,
          fingerprint,
          source: "module-review",
          issueType: "task",
          status: project.autoApproveIssues ? "approved" : "pending",
        },
      }).catch(async (error: unknown) => {
        if ((error as { code?: string }).code !== "P2002") throw error;
        return prisma.issue.findUniqueOrThrow({
          where: { projectId_fingerprint: { projectId: project.id, fingerprint } },
        });
      });
      return { content: [{ type: "text", text: JSON.stringify({ issueId: issue.id, moduleId: module.id, status: issue.status, confidence: issue.confidence, deduplicated: !!existing }) }] };
    },
  );

  server.registerTool(
    "complete_module_review",
    {
      title: "Complete an application module risk review",
      description: "Mark a claimed module reviewed after checking its source. Include a short summary of risks found or why none were found.",
      inputSchema: { moduleId: z.string(), summary: z.string().trim().min(1).max(5000) },
    },
    async ({ moduleId, summary }) => {
      const project = await getProjectForToken(token);
      const changed = await prisma.applicationModule.updateMany({
        where: { id: moduleId, projectId: project.id, reviewStatus: "in_progress" },
        data: { reviewStatus: "reviewed", reviewedAt: new Date(), leaseUntil: null, reviewSummary: summary },
      });
      if (!changed.count) throw new Error("Module is not claimed for review");
      return { content: [{ type: "text", text: JSON.stringify({ ok: true, moduleId, reviewStatus: "reviewed" }) }] };
    },
  );

  server.registerTool(
    "setup_project",
    {
      title: "Initialize or resume feature-graph discovery",
      description:
        "Return the pending audit count and decide whether to audit, inspect changes, continue discovery, or stop. Pass the repository's current commit SHA.",
      inputSchema: {
        currentRevision: z.string().trim().min(1).max(200).optional(),
        currentRevisionAt: z.string().trim().min(1).max(100).optional(),
      },
    },
    async ({ currentRevision, currentRevisionAt }) => {
      const project = await getProjectForToken(token);
      const state = await setupGraph(project.id, currentRevision);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              projectId: project.id,
              version: state.version,
              revision: state.revision,
              frontier: JSON.parse(state.frontier),
              discoveryStatus: state.discoveryStatus,
              pendingAuditCount: state.pendingCount,
              uncoveredNodeCount: state.uncoveredNodeCount,
              uncoveredNodeKeys: state.uncoveredNodeKeys,
              nextAction: state.nextAction,
              currentRevision: currentRevision ?? null,
              currentRevisionAt: currentRevisionAt ?? null,
              lastAuditedRevision: state.lastAuditedRevision,
              lastAuditedCommitAt: state.lastAuditedCommitAt,
              lastAuditedAt: state.lastAuditedAt,
            }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "save_graph_batch",
    {
      title: "Save an incremental feature-graph discovery batch",
      description:
        "Persist a bounded, source-evidenced graph update and remaining discovery frontier.",
      inputSchema: graphBatch,
    },
    async (input) => {
      const project = await getProjectForToken(token);
      const result = await saveGraphBatch(project.id, input);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    },
  );

  server.registerTool(
    "claim_next_audit",
    {
      title: "Claim the next graph journey to audit",
      description:
        "Atomically claim one pending or stale graph journey. Claims expire after 15 minutes; never overlap project audits.",
      inputSchema: {},
    },
    async () => {
      const project = await getProjectForToken(token);
      const result = await claimAudit(project.id);
      if (!result.run || !result.journey)
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ run: null, reason: result.reason }),
            },
          ],
        };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                runId: result.run.id,
                leaseUntil: result.leaseUntil,
                journey: {
                  id: result.journey.id,
                  key: result.journey.key,
                  flowId: result.journey.flowId,
                  flowName: result.journey.flow.name,
                  steps: result.journey.flow.steps,
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "create_flow",
    {
      title: "Create a flow",
      description:
        "Register a user flow you discovered in the codebase (or one the user described), with its ordered plain-English steps.",
      inputSchema: {
        name: z
          .string()
          .describe('Short flow name, e.g. "Login" or "Checkout"'),
        description: z
          .string()
          .optional()
          .describe("One-line description of the journey"),
        source: z.enum(["manual", "ai-discovered"]).default("ai-discovered"),
        steps: z
          .array(
            z.object({
              order: z.number().int().min(0),
              description: z
                .string()
                .describe("Plain-English description of this step"),
              expectedOutcome: z
                .string()
                .optional()
                .describe("What should be true in the code if this step works"),
            }),
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
          steps: {
            create: steps.map((s) => ({
              order: s.order,
              description: s.description,
              expectedOutcome: s.expectedOutcome ?? null,
            })),
          },
        },
        include: { steps: { orderBy: { order: "asc" } } },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { flowId: flow.id, steps: flow.steps },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "start_run",
    {
      title: "Start an audit run",
      description:
        "Begin a new audit run for a flow. Returns a runId to use with report_step_result, report_issue, and finish_run.",
      inputSchema: { flowId: z.string() },
    },
    async ({ flowId }) => {
      const project = await getProjectForToken(token);
      const flow = await prisma.flow.findFirst({
        where: { id: flowId, projectId: project.id },
      });
      if (!flow) throw new Error("Flow not found for this project");
      const run = await prisma.run.create({
        data: { flowId, status: "running" },
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ runId: run.id }) }],
      };
    },
  );

  server.registerTool(
    "report_step_result",
    {
      title: "Report a step's audit result",
      description:
        "Record what you found for one step of the flow after checking the code.",
      inputSchema: {
        runId: z.string(),
        order: z.number().int().min(0),
        description: z.string(),
        status: z.enum(["verified", "missing", "partial"]),
        notes: z
          .string()
          .optional()
          .describe(
            "What you found in the code, e.g. file references and reasoning",
          ),
      },
    },
    async ({ runId, order, description, status, notes }) => {
      const run = await requireRunForToken(runId, token);
      const step = await prisma.step.findFirst({
        where: { flowId: run.flowId, order },
      });
      if (!step) throw new Error("Step order does not exist in this flow");
      if (await prisma.stepResult.findFirst({ where: { runId, order } }))
        throw new Error("This step already has a result");
      const result = await prisma.stepResult.create({
        data: { runId, order, description, status, notes: notes ?? null },
      });
      return {
        content: [
          { type: "text", text: JSON.stringify({ stepResultId: result.id }) },
        ],
      };
    },
  );

  server.registerTool(
    "report_issue",
    {
      title: "Report an audit issue",
      description:
        "Report a concrete bug/gap you found in the code, with a ready-to-paste fix prompt for a coding agent.",
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
        fixPrompt: z
          .string()
          .describe(
            "Ready-to-paste instruction for a coding agent to fix this exact issue",
          ),
        filePath: z.string().optional(),
        lineStart: z.number().int().optional(),
        stepOrder: z.number().int().optional(),
      },
    },
    async (input) => {
      const run = await requireRunForToken(input.runId, token);
      const project = await getProjectForToken(token);
      const issue = await prisma.issue.create({
        data: {
          runId: input.runId,
          projectId: run.flow.projectId,
          severity: input.severity,
          category: input.category,
          title: input.title,
          description: input.description,
          fixPrompt: input.fixPrompt,
          filePath: input.filePath ?? null,
          lineStart: input.lineStart ?? null,
          stepOrder: input.stepOrder ?? null,
          status: project.autoApproveIssues ? "approved" : "pending",
        },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ issueId: issue.id, status: issue.status }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "claim_next_planning_issue",
    {
      title: "Claim the next manual request to plan",
      description:
        "Atomically claim the oldest unplanned manual request. Read the repository and issue description before submitting a source-audited implementation plan.",
      inputSchema: {},
    },
    async () => {
      const project = await getProjectForToken(token);
      const next = await prisma.issue.findFirst({
        where: { projectId: project.id, issueType: "request", planningStatus: "unplanned" },
        orderBy: { createdAt: "asc" },
      });
      if (!next) return { content: [{ type: "text", text: JSON.stringify({ issue: null }) }] };
      const claimed = await prisma.issue.updateMany({
        where: { id: next.id, planningStatus: "unplanned" },
        data: { planningStatus: "planning" },
      });
      if (!claimed.count) return { content: [{ type: "text", text: JSON.stringify({ issue: null, note: "contention, try again" }) }] };
      return {
        content: [{ type: "text", text: JSON.stringify({
          issue: { id: next.id, title: next.title, description: next.description, autoApprove: next.autoApprove },
          instructions: "Inspect the actual source code, identify files and dependencies, and split the work into independently executable subtasks with complete coding-agent prompts.",
        }, null, 2) }],
      };
    },
  );

  server.registerTool(
    "submit_issue_plan",
    {
      title: "Save a source-audited issue plan",
      description:
        "Update a claimed manual request with the implementation plan and create executable subtasks. Subtasks remain pending unless the request's auto-approve option was enabled.",
      inputSchema: {
        issueId: z.string(),
        planSummary: z.string().min(1).max(20000),
        subtasks: z.array(z.object({
          title: z.string().min(1).max(200),
          description: z.string().min(1).max(10000),
          fixPrompt: z.string().min(1).max(30000),
          severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
          category: z.string().min(1).max(80).default("other"),
          filePath: z.string().max(500).optional(),
          lineStart: z.number().int().optional(),
        })).min(1).max(30),
      },
    },
    async ({ issueId, planSummary, subtasks }) => {
      const project = await getProjectForToken(token);
      const parent = await prisma.issue.findFirst({ where: { id: issueId, projectId: project.id, issueType: "request", planningStatus: "planning" } });
      if (!parent) throw new Error("Manual request is not available for planning");
      const status = parent.autoApprove ? "approved" : "pending";
      await prisma.issue.update({ where: { id: parent.id }, data: {
          planningStatus: "planned",
          planSummary,
          fixPrompt: `Parent request planned. Complete the generated subtasks below.\n\n${planSummary}`,
          status,
      } });
      const results = await Promise.all(subtasks.map(async (task) => {
          const fingerprint = issueFingerprint({
            source: "planned",
            category: task.category,
            title: task.title,
            filePath: task.filePath,
          });
          const existing = await prisma.issue.findUnique({
            where: { projectId_fingerprint: { projectId: project.id, fingerprint } },
          });
          if (existing) {
            return { issue: existing, reused: true };
          }
          try {
            return { issue: await prisma.issue.create({ data: {
              projectId: project.id,
              parentId: parent.id,
              severity: task.severity,
              category: task.category,
              title: task.title,
              description: task.description,
              fixPrompt: task.fixPrompt,
              filePath: task.filePath ?? null,
              lineStart: task.lineStart ?? null,
              fingerprint,
              status,
              source: "planned",
              issueType: "task",
              autoApprove: parent.autoApprove,
            } }), reused: false };
          } catch (error) {
            if ((error as { code?: string }).code !== "P2002") throw error;
            return { issue: await prisma.issue.findUniqueOrThrow({
              where: { projectId_fingerprint: { projectId: project.id, fingerprint } },
            }), reused: true };
          }
      }));
      return { content: [{ type: "text", text: JSON.stringify({ ok: true, parentIssueId: parent.id, subtaskIds: results.map(({ issue }) => issue.id), status, reusedSubtasks: results.filter(({ reused }) => reused).length }) }] };
    },
  );

  server.registerTool(
    "claim_next_issue",
    {
      title: "Claim the next approved issue to fix",
      description:
        "Atomically claim the oldest 'approved' issue for this project (moving it to 'in_progress') so you can fix it. Returns null if there's nothing approved right now. Use in FIX MODE only, never right after reporting an issue.",
      inputSchema: {},
    },
    async () => {
      const project = await getProjectForToken(token);
      // Atomic claim: the findFirst just picks a candidate, but the actual
      // claim is the updateMany below with status: "approved" in its WHERE
      // clause — if two callers race for the same issue, only one UPDATE
      // matches (count: 1) and the other gets count: 0 and is told to
      // retry. That compare-and-swap is what makes this safe under
      // concurrent callers, not any assumption about the database engine.
      const next = await prisma.issue.findFirst({
        where: { projectId: project.id, status: "approved", issueType: "task" },
        orderBy: { createdAt: "asc" },
        include: { run: { include: { flow: true } } },
      });
      if (!next) {
        return {
          content: [{ type: "text", text: JSON.stringify({ issue: null }) }],
        };
      }
      const { count } = await prisma.issue.updateMany({
        where: { id: next.id, status: "approved", issueType: "task" },
        data: { status: "in_progress", pickedAt: new Date() },
      });
      if (count === 0) {
        // Someone else claimed it between findFirst and update — tell the caller to retry.
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                issue: null,
                note: "contention, try again",
              }),
            },
          ],
        };
      }
      const claimed = next;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                issue: {
                  id: claimed.id,
                  severity: next.severity,
                  category: next.category,
                  title: next.title,
                  description: next.description,
                  fixPrompt: next.fixPrompt,
                  filePath: next.filePath,
                  lineStart: next.lineStart,
                  flowName: next.run?.flow.name ?? "Planned task",
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.registerTool(
    "submit_issue_resolution",
    {
      title: "Submit a fix for review",
      description:
        "Report that you finished fixing a claimed issue. Moves it to 'in_review', or 'done' when project auto-close is enabled.",
      inputSchema: {
        issueId: z.string(),
        resolutionNotes: z
          .string()
          .describe("What you changed — files touched and a short summary"),
      },
    },
    async ({ issueId, resolutionNotes }) => {
      const project = await getProjectForToken(token);
      const issue = await prisma.issue.findUnique({ where: { id: issueId } });
      if (!issue || issue.projectId !== project.id)
        throw new Error("Issue not found for this project");
      const status = project.autoCloseIssues ? "done" : "in_review";
      const changed = await prisma.issue.updateMany({
        where: { id: issueId, status: "in_progress" },
        data: { status, resolutionNotes },
      });
      if (!changed.count)
        throw new Error(
          "Only a claimed in-progress issue can be submitted for review",
        );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: true, status }),
          },
        ],
      };
    },
  );

  server.registerTool(
    "finish_run",
    {
      title: "Finish an audit run",
      description:
        "Mark an audit run finished once every step has been checked.",
      inputSchema: {
        runId: z.string(),
        status: z.enum(["passed", "failed"]),
        summary: z
          .string()
          .optional()
          .describe("One-line summary of the audit outcome"),
      },
    },
    async ({ runId, status, summary }) => {
      const run = await requireRunForToken(runId, token);
      const [issueCount, stepResults] = await Promise.all([
        prisma.issue.count({ where: { runId } }),
        prisma.stepResult.findMany({ where: { runId } }),
      ]);
      const steps = await prisma.step.findMany({
        where: { flowId: run.flowId },
      });
      if (
        steps.some(
          (step) => !stepResults.some((result) => result.order === step.order),
        )
      )
        throw new Error("Report every flow step before finishing the run");
      if (
        status === "passed" &&
        (issueCount > 0 ||
          stepResults.some((result) => result.status !== "verified"))
      )
        throw new Error(
          "A passing run must have every step verified and no issues",
        );
      await prisma.$transaction(async (tx) => {
        await tx.run.update({
          where: { id: runId },
          data: {
            status,
            finishedAt: new Date(),
            summary: JSON.stringify({
              note: summary ?? null,
              totalSteps: stepResults.length,
              verifiedSteps: stepResults.filter((s) => s.status === "verified")
                .length,
              issueCount,
            }),
          },
        });
        const journey = await tx.graphJourney.findUnique({
          where: { flowId: run.flowId },
        });
        if (journey) {
          const state = await tx.graphState.findUnique({
            where: { projectId: journey.projectId },
          });
          if (!state || state.leaseRunId !== runId)
            throw new Error("This graph audit lease is no longer active");
          await tx.graphJourney.update({
            where: { id: journey.id },
            data: {
              status: status === "passed" ? "verified" : "failed",
              auditedAt: new Date(),
            },
          });
          const remainingAudits = await tx.graphJourney.count({
            where: {
              projectId: journey.projectId,
              status: { in: ["pending", "stale", "in_progress"] },
            },
          });
          const completedRevision =
            remainingAudits === 0 &&
            state.discoveryStatus === "complete" &&
            state.revision === run.graphRevision;
          await tx.graphState.update({
            where: { projectId: journey.projectId },
            data: {
              leaseRunId: null,
              leaseUntil: null,
              ...(completedRevision
                ? {
                    lastAuditedRevision: run.graphRevision,
                    lastAuditedCommitAt: state.revisionCommittedAt,
                    lastAuditedAt: new Date(),
                  }
                : {}),
            },
          });
        }
      });
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true }) }],
      };
    },
  );

  return server;
}

async function requireRunForToken(runId: string, token: string) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: { flow: true },
  });
  if (!run) throw new Error("Run not found");
  const project = await prisma.project.findUnique({
    where: { id: run.flow.projectId },
  });
  if (!project || project.mcpToken !== token)
    throw new Error("This run does not belong to the authenticated project");
  if (run.status !== "running")
    throw new Error("This audit run is already finished");
  return run;
}
