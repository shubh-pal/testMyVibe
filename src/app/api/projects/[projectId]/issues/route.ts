import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const issues = await prisma.issue.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    include: { run: { include: { flow: true } } },
  });
  return NextResponse.json(
    issues.map((i) => ({
      id: i.id,
      severity: i.severity,
      category: i.category,
      title: i.title,
      description: i.description,
      status: i.status,
      filePath: i.filePath,
      lineStart: i.lineStart,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      flowId: i.run.flow.id,
      flowName: i.run.flow.name,
      runId: i.runId,
    }))
  );
}
