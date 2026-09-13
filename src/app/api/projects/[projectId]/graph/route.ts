import { authorize } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { graphOverview } from "@/lib/graph";

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const denied = await authorize(req);
  if (denied) return denied;
  const { projectId } = await params;
  const [overview, nodes, edges, journeys] = await Promise.all([
    graphOverview(projectId),
    prisma.graphNode.findMany({ where: { projectId }, orderBy: [{ group: "asc" }, { label: "asc" }], take: 500 }),
    prisma.graphEdge.findMany({ where: { projectId }, orderBy: { key: "asc" }, take: 1000 }),
    prisma.graphJourney.findMany({
      where: { projectId },
      include: {
        flow: {
          include: {
            steps: { orderBy: { order: "asc" } },
            runs: {
              where: { status: { not: "running" } },
              orderBy: { startedAt: "desc" },
              take: 5,
              include: { stepResults: true, issues: true },
            },
          },
        },
      },
      orderBy: { key: "asc" },
      take: 200,
    }),
  ]);
  return NextResponse.json({ ...overview, nodes, edges, journeys, truncated: overview.counts.nodes > nodes.length || overview.counts.edges > edges.length || overview.counts.journeys > journeys.length });
}
