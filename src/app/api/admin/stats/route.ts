import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DAY_MS = 86_400_000;

// Buckets a list of timestamps into YYYY-MM-DD counts for the last `days`
// days (including today), so the client can render a simple trend line
// without needing per-database date-truncation SQL.
function bucketByDay(timestamps: Date[], days: number) {
  const buckets = new Map<string, number>();
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(new Date(now - i * DAY_MS).toISOString().slice(0, 10), 0);
  }
  for (const t of timestamps) {
    const key = t.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return Array.from(buckets, ([date, count]) => ({ date, count }));
}

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const since30 = new Date(Date.now() - 30 * DAY_MS);
  const since14 = new Date(Date.now() - 14 * DAY_MS);
  const since7 = new Date(Date.now() - 7 * DAY_MS);

  const [
    userCount,
    workspaceCount,
    projectCount,
    flowsBySource,
    runsByStatus,
    issuesByStatus,
    issuesBySeverity,
    issuesByCategory,
    mcpEventsByTool,
    mcpEventCount,
    mcpEventCount7d,
    newUsers7d,
    newUsers30d,
    recentUserTimestamps,
    recentMcpTimestamps,
    topProjects,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.project.count(),
    prisma.flow.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.run.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.issue.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.issue.groupBy({ by: ["severity"], _count: { _all: true } }),
    prisma.issue.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.mcpEvent.groupBy({
      by: ["tool"],
      _count: { _all: true },
      orderBy: { _count: { tool: "desc" } },
    }),
    prisma.mcpEvent.count(),
    prisma.mcpEvent.count({ where: { createdAt: { gte: since7 } } }),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.user.findMany({
      where: { createdAt: { gte: since14 } },
      select: { createdAt: true },
    }),
    prisma.mcpEvent.findMany({
      where: { createdAt: { gte: since14 } },
      select: { createdAt: true },
    }),
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        workspace: { select: { name: true } },
        createdAt: true,
        _count: {
          select: { flows: true, mcpEvents: true },
        },
      },
      orderBy: { mcpEvents: { _count: "desc" } },
      take: 10,
    }),
  ]);

  const toCountMap = (rows: { _count: { _all: number } }[], key: string) =>
    Object.fromEntries(
      rows.map((r) => [(r as unknown as Record<string, string>)[key], r._count._all]),
    );

  return NextResponse.json({
    users: {
      total: userCount,
      new7d: newUsers7d,
      new30d: newUsers30d,
      signupsByDay: bucketByDay(
        recentUserTimestamps.map((u) => u.createdAt),
        14,
      ),
    },
    workspaces: { total: workspaceCount },
    projects: { total: projectCount, topByMcpActivity: topProjects },
    flows: { bySource: toCountMap(flowsBySource, "source") },
    runs: { byStatus: toCountMap(runsByStatus, "status") },
    issues: {
      byStatus: toCountMap(issuesByStatus, "status"),
      bySeverity: toCountMap(issuesBySeverity, "severity"),
      byCategory: toCountMap(issuesByCategory, "category"),
    },
    mcp: {
      total: mcpEventCount,
      last7d: mcpEventCount7d,
      byTool: toCountMap(
        mcpEventsByTool as unknown as { _count: { _all: number } }[],
        "tool",
      ),
      callsByDay: bucketByDay(
        recentMcpTimestamps.map((e) => e.createdAt),
        14,
      ),
    },
  });
}
