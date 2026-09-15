import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      workspace: { select: { name: true } },
      _count: { select: { flows: true, mcpEvents: true } },
    },
  });

  return NextResponse.json(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      workspaceName: p.workspace?.name ?? "—",
      flowCount: p._count.flows,
      mcpEventCount: p._count.mcpEvents,
    })),
  );
}
