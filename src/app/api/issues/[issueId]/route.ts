import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["pending", "approved", "rejected", "in_progress", "in_review", "done"];

export async function GET(_req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      run: {
        include: {
          flow: { include: { project: true } },
          stepResults: { orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!issue) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(issue);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  const body = await req.json();
  const { status, reviewNotes } = body as { status?: string; reviewNotes?: string };

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(", ")}` }, { status: 400 });
  }

  const issue = await prisma.issue.update({
    where: { id: issueId },
    data: {
      ...(status ? { status } : {}),
      ...(reviewNotes !== undefined ? { reviewNotes } : {}),
    },
  });
  return NextResponse.json(issue);
}
