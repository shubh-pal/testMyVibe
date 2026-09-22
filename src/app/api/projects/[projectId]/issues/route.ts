import { authorize } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createIssueInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).optional().default(""),
  autoApprove: z.boolean().default(false),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await authorize(_req);
  if (denied) return denied;
  const { projectId } = await params;
  const issues = await prisma.issue.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    include: { run: { include: { flow: true } }, module: { select: { id: true, name: true, kind: true } } },
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
      flowId: i.run?.flow.id ?? null,
      flowName: i.run?.flow.name ?? "Manual request",
      runId: i.runId,
      source: i.source,
      issueType: i.issueType,
      parentId: i.parentId,
      planningStatus: i.planningStatus,
      planSummary: i.planSummary,
      autoApprove: i.autoApprove,
      module: i.module,
      confidence: i.confidence,
    })),
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await authorize(req);
  if (denied) return denied;
  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = createIssueInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Provide a title and description" }, { status: 400 });
  const issue = await prisma.issue.create({
    data: {
      projectId,
      severity: "medium",
      category: "feature-request",
      title: parsed.data.title,
      description:
        parsed.data.description || "No additional description provided.",
      fixPrompt: "Awaiting AI planning after source-code audit.",
      status: parsed.data.autoApprove ? "approved" : "pending",
      source: "manual",
      issueType: "request",
      planningStatus: "unplanned",
      autoApprove: parsed.data.autoApprove,
    },
  });
  return NextResponse.json(issue, { status: 201 });
}
