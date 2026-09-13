import { PrismaClient } from "@prisma/client";
const [projectId, email] = process.argv.slice(2);
if (!projectId || !email)
  throw new Error(
    "Usage: node --env-file=.env scripts/assign-legacy-project.mjs PROJECT_ID EXISTING_USER_EMAIL",
  );
const db = new PrismaClient();
try {
  const user = await db.user.findUniqueOrThrow({
    where: { email: email.toLowerCase() },
  });
  const result = await db.project.updateMany({
    where: { id: projectId, workspaceId: null },
    data: { workspaceId: user.workspaceId },
  });
  if (!result.count)
    throw new Error("Project does not exist or already belongs to a workspace");
  console.log("Legacy project assigned to the selected user's workspace.");
} finally {
  await db.$disconnect();
}
