import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  const [flowCount, runCount, issuesByStatus, recentRuns] = await Promise.all([
    prisma.flow.count({ where: { projectId } }),
    prisma.run.count({ where: { flow: { projectId } } }),
    prisma.issue.groupBy({ by: ["status"], where: { projectId }, _count: { _all: true } }),
    prisma.run.findMany({
      where: { flow: { projectId } },
      orderBy: { startedAt: "desc" },
      take: 6,
      include: { flow: true, _count: { select: { issues: true } } },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of issuesByStatus) statusCounts[row.status] = row._count._all;
  const totalIssues = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    flowCount,
    runCount,
    totalIssues,
    issueCounts: statusCounts,
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      status: r.status,
      startedAt: r.startedAt,
      flowName: r.flow.name,
      issueCount: r._count.issues,
    })),
  });
}
