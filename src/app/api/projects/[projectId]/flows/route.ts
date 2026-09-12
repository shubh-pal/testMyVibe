import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { StepDef } from "@/lib/steps";

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json();
  const { name, description, steps, source } = body as {
    name: string;
    description?: string;
    steps: StepDef[];
    source?: "manual" | "ai-discovered";
  };

  if (!name || !Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json({ error: "name and at least one step are required" }, { status: 400 });
  }

  const flow = await prisma.flow.create({
    data: {
      projectId,
      name,
      description: description ?? null,
      source: source ?? "manual",
      steps: {
        create: steps.map((s, i) => ({
          order: s.order ?? i,
          description: s.description,
          expectedOutcome: s.expectedOutcome ?? null,
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(flow, { status: 201 });
}
