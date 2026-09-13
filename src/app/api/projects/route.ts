import { projectInput } from "@/lib/validation";
import { authorize, currentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicProject } from "@/lib/project";

export async function GET(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;
  const projects = await prisma.project.findMany({
    where: { workspaceId: (await currentUser())!.workspaceId },
    orderBy: { createdAt: "desc" },
    include: { flows: { select: { id: true } } },
  });
  return NextResponse.json(projects.map(publicProject));
}

export async function POST(req: Request) {
  const denied = await authorize(req);
  if (denied) return denied;
  const parsed = projectInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  const body = parsed.data;
  const { name } = body;
  const project = await prisma.project.create({
    data: {
      workspaceId: (await currentUser())!.workspaceId,
      name,
    },
  });
  return NextResponse.json(publicProject(project), { status: 201 });
}
