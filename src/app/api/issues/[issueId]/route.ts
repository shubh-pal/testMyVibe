import { z } from "zod";
import { authorize } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "in_progress",
  "in_review",
  "done",
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const denied = await authorize(_req);
  if (denied) return denied;
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
      parent: { select: { id: true, title: true } },
      children: { orderBy: { createdAt: "asc" } },
      module: { select: { id: true, name: true, kind: true } },
    },
  });
  if (!issue) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(issue);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ issueId: string }> },
) {
  const denied = await authorize(req);
  if (denied) return denied;
  const { issueId } = await params;
  const parsed = z
    .object({
      status: z.string().optional(),
      reviewNotes: z.string().max(10000).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid issue update" },
      { status: 400 },
    );
  const body = parsed.data;
  const { status, reviewNotes } = body as {
    status?: string;
    reviewNotes?: string;
  };

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
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
