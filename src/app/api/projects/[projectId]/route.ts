import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { flows: { include: { _count: { select: { runs: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json();
  const { name, repoPath, repoUrl } = body as { name?: string; repoPath?: string | null; repoUrl?: string | null };
  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(repoPath !== undefined ? { repoPath: repoPath || null } : {}),
      ...(repoUrl !== undefined ? { repoUrl: repoUrl || null } : {}),
    },
  });
  return NextResponse.json(project);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await prisma.project.delete({ where: { id: projectId } });
  return NextResponse.json({ ok: true });
}
