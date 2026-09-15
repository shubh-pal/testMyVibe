import { NextResponse } from "next/server";
import { requireSuperAdmin, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin)
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      workspace: {
        select: {
          id: true,
          name: true,
          _count: { select: { projects: true } },
        },
      },
    },
  });

  return NextResponse.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.createdAt,
      isSuperAdmin: isSuperAdmin({ email: u.email }),
      workspace: {
        id: u.workspace.id,
        name: u.workspace.name,
        projectCount: u.workspace._count.projects,
      },
    })),
  );
}
