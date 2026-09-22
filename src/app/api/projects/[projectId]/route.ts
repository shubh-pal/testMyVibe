import { z } from "zod";
import { projectInput } from "@/lib/validation";
import { authorize } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicProject } from "@/lib/project";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await authorize(_req);
  if (denied) return denied;
  const { projectId } = await params;
  const summary = new URL(_req.url).searchParams.get("summary") === "1";
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    ...(summary
      ? {}
      : {
          include: {
            flows: {
              include: { _count: { select: { runs: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
        }),
  });
  if (!project)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(publicProject(project));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await authorize(req);
  if (denied) return denied;
  const { projectId } = await params;
  const input = await req.json().catch(() => null);
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!existing)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  const parsed = projectInput
    .partial()
    .extend({
      autoApproveIssues: z.boolean().optional(),
      autoCloseIssues: z.boolean().optional(),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Provide a valid name and boolean automation settings" },
      { status: 400 },
    );
  const project = await prisma.project.update({
    where: { id: projectId },
    data: parsed.data,
  });
  return NextResponse.json(publicProject(project));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const denied = await authorize(_req);
  if (denied) return denied;
  const { projectId } = await params;
  await prisma.project.delete({ where: { id: projectId } });
  return NextResponse.json({ ok: true });
}
