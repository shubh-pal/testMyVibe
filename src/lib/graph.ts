import { z } from "zod";
import { prisma } from "@/lib/prisma";

const key = z.string().trim().min(1).max(240);
const label = z.string().trim().min(1).max(300);
const refs = z.array(z.string().trim().min(1).max(500)).min(1).max(20);
export const graphBatch = z.object({
  expectedVersion: z.number().int().min(0),
  revision: z.string().trim().min(1).max(200),
  revisionCommittedAt: z.string().trim().min(1).max(100).optional(),
  frontier: z.array(key).max(2000),
  discoveryStatus: z.enum(["in_progress", "complete"]),
  nodes: z
    .array(
      z.object({
        key,
        label,
        kind: z.enum(["entry", "page", "action", "state"]),
        group: label,
        sourceRefs: refs,
      }),
    )
    .max(100),
  edges: z
    .array(z.object({ key, fromKey: key, toKey: key, label, sourceRefs: refs }))
    .max(200),
  journeys: z
    .array(
      z.object({
        key,
        name: label,
        flowId: z.string().optional(),
        edgeKeys: z.array(key).min(1).max(50),
      }),
    )
    .max(50),
});

export async function setupGraph(projectId: string, currentRevision?: string) {
  const state = await prisma.graphState.upsert({
    where: { projectId },
    create: { projectId },
    update: {},
  });
  const pendingCount = await prisma.graphJourney.count({
    where: {
      projectId,
      status: { in: ["pending", "stale", "in_progress"] },
    },
  });
  let nextAction:
    | "audit_pending"
    | "continue_discovery"
    | "discover_changes"
    | "inspect_revision"
    | "up_to_date";
  if (pendingCount > 0) nextAction = "audit_pending";
  else if (
    state.discoveryStatus !== "complete" ||
    JSON.parse(state.frontier).length
  )
    nextAction = "continue_discovery";
  else if (!currentRevision) nextAction = "inspect_revision";
  else if (state.lastAuditedRevision === currentRevision)
    nextAction = "up_to_date";
  else nextAction = "discover_changes";
  return { ...state, pendingCount, nextAction };
}

export async function saveGraphBatch(
  projectId: string,
  raw: z.infer<typeof graphBatch>,
) {
  const input = graphBatch.parse(raw);
  const revisionCommittedAt = input.revisionCommittedAt
    ? new Date(input.revisionCommittedAt)
    : null;
  if (revisionCommittedAt && Number.isNaN(revisionCommittedAt.getTime()))
    throw new Error("revisionCommittedAt must be a valid ISO date");
  if (input.discoveryStatus === "complete" && input.frontier.length)
    throw new Error("Complete discovery must have an empty frontier");
  for (const collection of [input.nodes, input.edges, input.journeys]) {
    if (new Set(collection.map((x) => x.key)).size !== collection.length)
      throw new Error("Duplicate keys in batch");
  }
  return prisma.$transaction(async (tx) => {
    const state = await tx.graphState.findUnique({ where: { projectId } });
    if (!state) throw new Error("Call setup_project first");
    if (state.leaseUntil && state.leaseUntil > new Date())
      throw new Error(
        "Audit in progress; retry discovery after its lease ends",
      );
    const changed = await tx.graphState.updateMany({
      where: { projectId, version: input.expectedVersion },
      data: {
        version: { increment: 1 },
        revision: input.revision,
        revisionCommittedAt,
        frontier: JSON.stringify(input.frontier),
        discoveryStatus: input.discoveryStatus,
      },
    });
    if (!changed.count)
      throw new Error(
        "Discovery version conflict; call setup_project and retry with the latest checkpoint",
      );
    const oldNodes = await tx.graphNode.findMany({ where: { projectId } });
    const oldEdges = await tx.graphEdge.findMany({ where: { projectId } });
    const oldJourneys = await tx.graphJourney.findMany({
      where: { projectId },
    });
    for (const [old, incoming, limit] of [
      [oldNodes, input.nodes, 5000],
      [oldEdges, input.edges, 10000],
      [oldJourneys, input.journeys, 2000],
    ] as const) {
      if (
        new Set([...old.map((x) => x.key), ...incoming.map((x) => x.key)])
          .size > limit
      )
        throw new Error(`Project graph limit exceeded (${limit})`);
    }
    const nodeKeys = new Set([
      ...oldNodes.map((n) => n.key),
      ...input.nodes.map((n) => n.key),
    ]);
    const changedNodes = new Set<string>();
    for (const node of input.nodes) {
      const data = {
        ...node,
        sourceRefs: JSON.stringify(node.sourceRefs),
        revision: input.revision,
      };
      const old = oldNodes.find((n) => n.key === node.key);
      if (
        !old ||
        old.revision !== input.revision ||
        old.label !== node.label ||
        old.sourceRefs !== data.sourceRefs ||
        old.group !== node.group ||
        old.kind !== node.kind
      )
        changedNodes.add(node.key);
      await tx.graphNode.upsert({
        where: { projectId_key: { projectId, key: node.key } },
        create: { projectId, ...data },
        update: data,
      });
    }
    const changedEdges = new Set(
      oldEdges
        .filter((e) => changedNodes.has(e.fromKey) || changedNodes.has(e.toKey))
        .map((e) => e.key),
    );
    for (const edge of input.edges) {
      if (!nodeKeys.has(edge.fromKey) || !nodeKeys.has(edge.toKey))
        throw new Error("Edge endpoints must exist in this project");
      const data = {
        ...edge,
        sourceRefs: JSON.stringify(edge.sourceRefs),
        revision: input.revision,
      };
      const old = oldEdges.find((e) => e.key === edge.key);
      if (
        !old ||
        old.revision !== input.revision ||
        old.fromKey !== edge.fromKey ||
        old.toKey !== edge.toKey ||
        old.label !== edge.label ||
        old.sourceRefs !== data.sourceRefs
      )
        changedEdges.add(edge.key);
      await tx.graphEdge.upsert({
        where: { projectId_key: { projectId, key: edge.key } },
        create: { projectId, ...data },
        update: data,
      });
    }
    const edges = await tx.graphEdge.findMany({ where: { projectId } });
    // Only paths touched by the submitted changed nodes or edges become stale.
    // Verified journeys that are absent from a diff batch stay verified.
    for (const journey of oldJourneys) {
      if (
        (JSON.parse(journey.edgeKeys) as string[]).some((k) =>
          changedEdges.has(k),
        )
      ) {
        await tx.graphJourney.update({
          where: { id: journey.id },
          data: { status: "stale", revision: input.revision },
        });
      }
    }
    for (const journey of input.journeys) {
      const path = journey.edgeKeys.map((k) => edges.find((e) => e.key === k));
      if (path.some((e) => !e))
        throw new Error("Journey references an unknown edge");
      if (path.some((e, i) => i > 0 && path[i - 1]!.toKey !== e!.fromKey))
        throw new Error("Journey edges must form a connected ordered path");
      const existing = oldJourneys.find((j) => j.key === journey.key);
      if (existing && journey.flowId && journey.flowId !== existing.flowId)
        throw new Error("Journey flow identity cannot change");
      let flowId = existing?.flowId ?? journey.flowId;
      if (
        flowId &&
        !(await tx.flow.findFirst({ where: { id: flowId, projectId } }))
      )
        throw new Error("Flow does not belong to this project");
      if (
        flowId &&
        !existing &&
        (await tx.graphJourney.findUnique({ where: { flowId } }))
      )
        throw new Error("Flow already belongs to a graph journey");
      if (!flowId) {
        const flow = await tx.flow.create({
          data: {
            projectId,
            name: journey.name,
            source: "ai-discovered",
            steps: {
              create: path.map((e, order) => ({
                order,
                description: e!.label,
              })),
            },
          },
        });
        flowId = flow.id;
      }
      // Existing flows keep their step IDs/history. New paths get fresh steps only
      // when their graph definition changes and no audit owns the graph.
      const pathChanged =
        existing && existing.edgeKeys !== JSON.stringify(journey.edgeKeys);
      if (pathChanged) {
        await tx.step.deleteMany({ where: { flowId } });
        await tx.step.createMany({
          data: path.map((e, order) => ({
            flowId: flowId!,
            order,
            description: e!.label,
          })),
        });
      }
      await tx.graphJourney.upsert({
        where: { projectId_key: { projectId, key: journey.key } },
        create: {
          projectId,
          key: journey.key,
          flowId,
          edgeKeys: JSON.stringify(journey.edgeKeys),
          revision: input.revision,
        },
        update: {
          edgeKeys: JSON.stringify(journey.edgeKeys),
          revision: input.revision,
          ...(pathChanged ? { status: "stale" } : {}),
        },
      });
    }
    return {
      version: input.expectedVersion + 1,
      discoveryStatus: input.discoveryStatus,
    };
  });
}

export async function claimAudit(projectId: string) {
  return prisma.$transaction(async (tx) => {
    const state = await tx.graphState.findUnique({ where: { projectId } });
    if (!state)
      throw new Error("Call setup_project and discover graph journeys first");
    const now = new Date();
    if (state.leaseUntil && state.leaseUntil > now)
      return { run: null, reason: "audit_in_progress" };
    if (state.leaseRunId) {
      await tx.run.updateMany({
        where: { id: state.leaseRunId, status: "running" },
        data: {
          status: "blocked",
          finishedAt: now,
          summary: "Audit lease expired; coverage was not verified.",
        },
      });
      await tx.graphJourney.updateMany({
        where: { projectId, status: "in_progress" },
        data: { status: "stale" },
      });
    }
    const journey = await tx.graphJourney.findFirst({
      where: { projectId, status: { in: ["pending", "stale"] } },
      orderBy: [{ auditedAt: "asc" }, { id: "asc" }],
      include: { flow: { include: { steps: { orderBy: { order: "asc" } } } } },
    });
    if (!journey) return { run: null, reason: "queue_empty" };
    const run = await tx.run.create({
      data: {
        flowId: journey.flowId,
        status: "running",
        graphRevision: state.revision,
        evidenceType: "source",
      },
    });
    const leaseUntil = new Date(now.getTime() + 15 * 60_000);
    await tx.graphState.update({
      where: { projectId },
      data: { leaseRunId: run.id, leaseUntil },
    });
    await tx.graphJourney.update({
      where: { id: journey.id },
      data: { status: "in_progress" },
    });
    return { run, journey, leaseUntil };
  });
}

export async function graphOverview(projectId: string) {
  const [state, groups, statuses, nodes, edges, journeys] = await Promise.all([
    prisma.graphState.findUnique({ where: { projectId } }),
    prisma.graphNode.groupBy({
      by: ["group"],
      where: { projectId },
      _count: true,
    }),
    prisma.graphJourney.groupBy({
      by: ["status"],
      where: { projectId },
      _count: true,
    }),
    prisma.graphNode.count({ where: { projectId } }),
    prisma.graphEdge.count({ where: { projectId } }),
    prisma.graphJourney.count({ where: { projectId } }),
  ]);
  return { state, groups, statuses, counts: { nodes, edges, journeys } };
}
