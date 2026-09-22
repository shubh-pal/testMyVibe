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

type CachedUser = {
  user: NonNullable<Awaited<ReturnType<typeof loadSession>>>["user"];
  expiresAt: number;
  cachedUntil: number;
};
const userCache = new Map<string, CachedUser>();
const userLoads = new Map<string, ReturnType<typeof loadSession>>();
const projectAccessCache = new Map<string, number>();
const USER_CACHE_TTL_MS = 5_000;

async function loadSession(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { include: { workspace: true } } },
  });
}

export async function currentUser() {
  const token = (await cookies()).get("tmv_session")?.value;
  if (!token) return null;
  const sessionId = digest(token);
  const cached = userCache.get(sessionId);
  const now = Date.now();
  if (cached && cached.cachedUntil > now && cached.expiresAt > now)
    return cached.user;
  let sessionPromise = userLoads.get(sessionId);
  if (!sessionPromise) {
    sessionPromise = loadSession(sessionId);
    userLoads.set(sessionId, sessionPromise);
    void sessionPromise.finally(() => userLoads.delete(sessionId));
  }
  const session = await sessionPromise;
  if (!session || session.expiresAt <= new Date()) {
    userCache.delete(sessionId);
    return null;
  }
  userCache.set(sessionId, {
    user: session.user,
    expiresAt: session.expiresAt.getTime(),
    cachedUntil: now + USER_CACHE_TTL_MS,
  });
  if (userCache.size > 1000) userCache.delete(userCache.keys().next().value!);
  return session.user;
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
// Super-admin access is configured via env, not a DB flag, so it can be set
// per-deployment (a local .env, a Cloud Run env var) without a data migration
// or an account field visible to normal users.
function superAdminEmails() {
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
export function isSuperAdmin(user: { email: string } | null) {
  return !!user && superAdminEmails().includes(user.email.toLowerCase());
}
export async function requireSuperAdmin() {
  const user = await currentUser();
  if (!isSuperAdmin(user)) return null;
  return user;
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("tmv_session")?.value;
  if (token) {
    const sessionId = digest(token);
    userCache.delete(sessionId);
    userLoads.delete(sessionId);
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
  jar.delete("tmv_session");
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  // Behind Cloud Run's front end, the connection Next.js sees is plain HTTP
  // even though the browser talked to the service over HTTPS, so req.url's
  // *scheme* can't be trusted directly — X-Forwarded-Proto fixes that, and
  // Cloud Run's front end sets it based on the real client connection.
  //
  // The *host* must NOT come from X-Forwarded-Host: that header is passed
  // through from the client completely unverified (confirmed against the
  // live deployment — a request can set X-Forwarded-Host to anything), so
  // trusting it lets a spoofed Origin sail through this check. The native
  // Host header is safe to use instead — browsers refuse to let JavaScript
  // override it on a request, so a cross-site fetch() can never carry a
  // forged one.
  const url = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = req.headers.get("host") ?? url.host;
  return origin === `${proto}://${host}`;
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
          select: { projectId: true },
        })
      )?.projectId ?? "";
  if (parts[2] === "runs" && id)
    projectId =
      (await prisma.run.findUnique({ where: { id }, include: { flow: true } }))
        ?.flow.projectId ?? "";
  if (projectId !== undefined) {
    const accessKey = `${user.workspaceId}:${projectId}`;
    const now = Date.now();
    const cachedAccessUntil = projectAccessCache.get(accessKey);
    if (!cachedAccessUntil || cachedAccessUntil <= now) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId: user.workspaceId },
        select: { id: true },
      });
      if (!project)
        return Response.json({ error: "Not found" }, { status: 404 });
      projectAccessCache.set(accessKey, now + USER_CACHE_TTL_MS);
    }
  }
  return null;
}
