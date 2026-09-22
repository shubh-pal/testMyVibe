import { authorize, currentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Org-level aggregate stats across every project.
export async function GET(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;
  const workspaceId = (await currentUser())!.workspaceId;
  const [projectCount, flowCount, runCount, issuesByStatus, recentIssues] =
    await Promise.all([
      prisma.project.count({ where: { workspaceId } }),
      prisma.flow.count({ where: { project: { workspaceId } } }),
      prisma.run.count({ where: { flow: { project: { workspaceId } } } }),
      prisma.issue.groupBy({
        by: ["status"],
        where: { run: { flow: { project: { workspaceId } } } },
        _count: { _all: true },
      }),
      prisma.issue.findMany({
        where: { run: { flow: { project: { workspaceId } } } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { run: { include: { flow: { include: { project: true } } } } },
      }),
    ]);

  const statusCounts: Record<string, number> = {};
  for (const row of issuesByStatus) statusCounts[row.status] = row._count._all;

  return NextResponse.json({
    projectCount,
    flowCount,
    runCount,
    issueCounts: statusCounts,
    recentIssues: recentIssues.filter((i) => i.run).map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      status: i.status,
      createdAt: i.createdAt,
      projectId: i.run!.flow.projectId,
      projectName: i.run!.flow.project.name,
      flowName: i.run!.flow.name,
    })),
  });
}
