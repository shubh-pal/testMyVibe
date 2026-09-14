// Cloud Run (and any fresh/ephemeral container) starts with no database
// file on disk. Apply pending Prisma migrations before serving requests so
// a brand-new instance boots with an up-to-date schema instead of crashing
// on the first query.
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["next", "start"]);
