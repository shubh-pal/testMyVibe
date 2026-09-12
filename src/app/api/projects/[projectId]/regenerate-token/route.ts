import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createId } from "@/lib/id";

export async function POST(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { mcpToken: createId() },
  });
  return NextResponse.json({ mcpToken: project.mcpToken });
}
