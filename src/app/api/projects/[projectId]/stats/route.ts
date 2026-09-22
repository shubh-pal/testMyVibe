import { authorize } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await authorize(_req);
  if (denied) return denied;
  const { projectId } = await params;

  type StatsRow = {
    flow_count: number;
    run_count: number;
    issue_counts: Record<string, number>;
    recent_runs: {
      id: string;
      status: string;
      startedAt: string;
      flowName: string;
      issueCount: number;
    }[];
  };
  const [row] = await prisma.$queryRaw<StatsRow[]>`
    WITH recent_runs AS (
      SELECT r.id, r.status, r."startedAt", f.name AS "flowName",
             COUNT(i.id)::int AS "issueCount"
      FROM "Run" r
      JOIN "Flow" f ON f.id = r."flowId"
      LEFT JOIN "Issue" i ON i."runId" = r.id
      WHERE f."projectId" = ${projectId}
      GROUP BY r.id, r.status, r."startedAt", f.name
      ORDER BY r."startedAt" DESC
      LIMIT 6
    ), issue_counts AS (
      SELECT status, COUNT(*)::int AS count
      FROM "Issue"
      WHERE "projectId" = ${projectId}
      GROUP BY status
    )
    SELECT
      (SELECT COUNT(*)::int FROM "Flow" WHERE "projectId" = ${projectId}) AS flow_count,
      (SELECT COUNT(*)::int FROM "Run" r JOIN "Flow" f ON f.id = r."flowId" WHERE f."projectId" = ${projectId}) AS run_count,
      COALESCE((SELECT jsonb_object_agg(status, count) FROM issue_counts), '{}'::jsonb) AS issue_counts,
      COALESCE((SELECT jsonb_agg(to_jsonb(recent_runs) ORDER BY "startedAt" DESC) FROM recent_runs), '[]'::jsonb) AS recent_runs
  `;
  const flowCount = row?.flow_count ?? 0;
  const runCount = row?.run_count ?? 0;
  const statusCounts = row?.issue_counts ?? {};
  const recentRuns = row?.recent_runs ?? [];
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
      flowName: r.flowName,
      issueCount: r.issueCount,
    })),
  });
}
