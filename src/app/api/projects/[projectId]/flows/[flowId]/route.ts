import { authorize } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; flowId: string }> },
) {
  const denied = await authorize(_req);
  if (denied) return denied;
  const { flowId } = await params;
  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
    include: {
      steps: { orderBy: { order: "asc" } },
      project: true,
      runs: { orderBy: { startedAt: "desc" }, take: 10 },
    },
  });
  if (!flow) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(flow);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; flowId: string }> },
) {
  const denied = await authorize(_req);
  if (denied) return denied;
  const { flowId } = await params;
  await prisma.flow.delete({ where: { id: flowId } });
  return NextResponse.json({ ok: true });
}
