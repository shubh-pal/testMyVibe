import {
  currentUser,
  createSession,
  hashPassword,
  verifyPassword,
  logout,
  sameOrigin,
  isSuperAdmin,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET() {
  const user = await currentUser();
  return user
    ? Response.json({
        name: user.name,
        email: user.email,
        workspace: user.workspace,
        isSuperAdmin: isSuperAdmin(user),
      })
    : Response.json({ error: "Please sign in" }, { status: 401 });
}
const input = z.object({
  mode: z.enum(["signup", "login"]),
  email: z.email().max(254),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(1).max(80).optional(),
  workspace: z.string().trim().min(1).max(80).optional(),
});
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Enter a valid email and a password of 12–128 characters." },
      { status: 400 },
    );
  const body = parsed.data;
  const email = body.email.toLowerCase();
  if (body.mode === "signup") {
    if (!body.name || !body.workspace)
      return Response.json(
        { error: "Name and workspace are required" },
        { status: 400 },
      );
    try {
      const user = await prisma.user.create({
        data: {
          email,
          name: body.name,
          passwordHash: hashPassword(body.password),
          workspace: { create: { name: body.workspace } },
        },
      });
      await createSession(user.id);
      return Response.json({ ok: true }, { status: 201 });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002")
        return Response.json(
          {
            error: "Unable to create account with this email. Try signing in.",
          },
          { status: 409 },
        );
      throw error;
    }
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(body.password, user.passwordHash))
    return Response.json(
      { error: "Invalid email or password" },
      { status: 401 },
    );
  await createSession(user.id);
  return Response.json({ ok: true });
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  await logout();
  return Response.json({ ok: true });
}
