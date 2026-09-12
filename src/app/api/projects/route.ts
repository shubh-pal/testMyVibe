import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { flows: { select: { id: true } } },
  });
  return NextResponse.json(projects);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, repoPath, repoUrl } = body ?? {};
  if (!name || (!repoPath && !repoUrl)) {
    return NextResponse.json({ error: "name and a repoPath or repoUrl are required" }, { status: 400 });
  }
  const project = await prisma.project.create({ data: { name, repoPath: repoPath || null, repoUrl: repoUrl || null } });
  return NextResponse.json(project, { status: 201 });
}
