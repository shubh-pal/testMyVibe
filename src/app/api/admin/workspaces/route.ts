import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      users: { select: { email: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { users: true, projects: true } },
    },
  });

  return NextResponse.json(
    workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      createdAt: w.createdAt,
      userCount: w._count.users,
      projectCount: w._count.projects,
      ownerEmail: w.users[0]?.email ?? null,
    })),
  );
}
