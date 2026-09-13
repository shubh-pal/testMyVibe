import { authorize } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const denied = await authorize(_req);
  if (denied) return denied;
  const { runId } = await params;
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      flow: { include: { project: true } },
      stepResults: { orderBy: { order: "asc" } },
      issues: { orderBy: { severity: "asc" } },
    },
  });
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(run);
}
