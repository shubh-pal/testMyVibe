import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { prisma } from "@/lib/prisma";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  return timingSafeEqual(
    scryptSync(password, salt, 64),
    Buffer.from(key, "hex"),
  );
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function currentUser() {
  const token = (await cookies()).get("tmv_session")?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: digest(token) },
    include: { user: { include: { workspace: true } } },
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await prisma.session.create({
    data: { id: digest(token), userId, expiresAt },
  });
  (await cookies()).set("tmv_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("tmv_session")?.value;
  if (token) await prisma.session.deleteMany({ where: { id: digest(token) } });
  jar.delete("tmv_session");
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}
export async function authorize(req: Request) {
  if (!["GET", "HEAD"].includes(req.method) && !sameOrigin(req))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please sign in" }, { status: 401 });
  const parts = new URL(req.url).pathname.split("/");
  const id = parts[3];
  let projectId: string | undefined;
  if (parts[2] === "projects" && id) {
    projectId = id;
    if (parts[4] === "flows" && parts[5]) {
      const flow = await prisma.flow.findFirst({
        where: { id: parts[5], projectId: id },
      });
      if (!flow) return Response.json({ error: "Not found" }, { status: 404 });
    }
  }
  if (parts[2] === "issues" && id)
    projectId =
      (
        await prisma.issue.findUnique({
          where: { id },
          include: { run: { include: { flow: true } } },
        })
      )?.run.flow.projectId ?? "";
  if (parts[2] === "runs" && id)
    projectId =
      (await prisma.run.findUnique({ where: { id }, include: { flow: true } }))
        ?.flow.projectId ?? "";
  if (
    projectId !== undefined &&
    !(await prisma.project.findFirst({
      where: { id: projectId, workspaceId: user.workspaceId },
    }))
  )
    return Response.json({ error: "Not found" }, { status: 404 });
  return null;
}
