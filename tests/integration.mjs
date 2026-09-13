import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const suffix = Date.now();
const emails = [`qa-a-${suffix}@example.test`, `qa-b-${suffix}@example.test`];
const cookies = [];
async function api(
  path,
  method = "GET",
  data,
  account = 0,
  expected = 200,
  headers = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookies[account] ? { Cookie: cookies[account] } : {}),
      ...headers,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = await r.json();
  assert.equal(r.status, expected, path + " " + JSON.stringify(body));
  return { body, cookie: r.headers.get("set-cookie")?.split(";")[0] };
}
let token;
async function tool(name, args = {}, expectedError = false) {
  const { body } = await api(
    "/api/mcp",
    "POST",
    {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    },
    0,
    200,
    {
      Authorization: "Bearer " + token,
      Accept: "application/json, text/event-stream",
    },
  );
  assert.equal(
    Boolean(body.result?.isError),
    expectedError,
    JSON.stringify(body),
  );
  return expectedError ? body : JSON.parse(body.result.content[0].text);
}
try {
  await api("/api/projects", "GET", undefined, 0, 401);
  for (let i = 0; i < 2; i++) {
    const result = await api(
      "/api/auth",
      "POST",
      {
        mode: "signup",
        name: "QA",
        workspace: "QA " + i,
        email: emails[i],
        password: "integration-test-password",
      },
      i,
      201,
    );
    cookies[i] = result.cookie;
  }
  const { body: p } = await api(
    "/api/projects",
    "POST",
    { name: "QA project" },
    0,
    201,
  );
  assert.equal("repoPath" in p, false);
  assert.equal("repoUrl" in p, false);
  token = p.mcpToken;
  assert.equal(
    (await api("/api/projects", "GET", undefined, 1)).body.length,
    0,
  );
  assert.equal(
    (await api("/api/stats", "GET", undefined, 1)).body.projectCount,
    0,
  );
  for (const method of ["GET", "PATCH", "DELETE"])
    await api(
      "/api/projects/" + p.id,
      method,
      method === "PATCH" ? { name: "Attack" } : undefined,
      1,
      404,
    );
  await api("/api/projects", "POST", { name: " " }, 0, 400);
  await api("/api/projects", "POST", { name: "Attack" }, 0, 403, {
    Origin: "https://untrusted.example",
  });
  const flow = await tool("create_flow", {
    name: "Sign in",
    steps: [{ order: 0, description: "Submit credentials" }],
  });
  await api(
    `/api/projects/${p.id}/flows/${flow.flowId}`,
    "GET",
    undefined,
    1,
    404,
  );
  const run = await tool("start_run", { flowId: flow.flowId });
  await tool("finish_run", { runId: run.runId, status: "passed" }, true);
  await tool("report_step_result", {
    runId: run.runId,
    order: 0,
    description: "Submit credentials",
    status: "partial",
  });
  const issue = await tool("report_issue", {
    runId: run.runId,
    severity: "high",
    category: "validation",
    title: "QA finding",
    description: "QA evidence",
    fixPrompt: "QA fix",
  });
  await api("/api/runs/" + run.runId, "GET", undefined, 1, 404);
  await api(
    "/api/issues/" + issue.issueId,
    "PATCH",
    { status: "approved" },
    1,
    404,
  );
  assert.equal((await tool("claim_next_issue")).issue, null);
  await tool(
    "submit_issue_resolution",
    { issueId: issue.issueId, resolutionNotes: "Unauthorized transition" },
    true,
  );
  await api("/api/issues/" + issue.issueId, "PATCH", { status: "approved" });
  assert.equal((await tool("claim_next_issue")).issue.id, issue.issueId);
  assert.equal((await tool("claim_next_issue")).issue, null);
  await tool("submit_issue_resolution", {
    issueId: issue.issueId,
    resolutionNotes: "Fixed and tested",
  });
  assert.equal(p.autoApproveIssues, false);
  assert.equal(p.autoCloseIssues, false);
  assert.equal(
    (await db.issue.findUnique({ where: { id: issue.issueId } })).status,
    "in_review",
  );
  await api(
    "/api/projects/" + p.id,
    "PATCH",
    { autoApproveIssues: "true" },
    0,
    400,
  );
  await api(
    "/api/projects/" + p.id,
    "PATCH",
    { autoApproveIssues: true },
    1,
    404,
  );
  const updated = await api("/api/projects/" + p.id, "PATCH", {
    autoApproveIssues: true,
    autoCloseIssues: true,
  });
  assert.equal(updated.body.autoApproveIssues, true);
  assert.equal((await api("/api/projects/" + p.id)).body.autoCloseIssues, true);
  assert.equal(
    (await db.issue.findUnique({ where: { id: issue.issueId } })).status,
    "in_review",
  );
  const finding = {
    runId: run.runId,
    severity: "low",
    category: "other",
    title: "Automatic finding",
    description: "Evidence",
    fixPrompt: "Fix finding",
  };
  const automatic = await tool("report_issue", finding);
  assert.equal(automatic.status, "approved");
  await tool(
    "submit_issue_resolution",
    { issueId: automatic.issueId, resolutionNotes: "Not claimed" },
    true,
  );
  assert.equal((await tool("claim_next_issue")).issue.id, automatic.issueId);
  assert.equal(
    (
      await tool("submit_issue_resolution", {
        issueId: automatic.issueId,
        resolutionNotes: "Fixed and tested automatically",
      })
    ).status,
    "done",
  );
  await api("/api/projects/" + p.id, "PATCH", {
    autoApproveIssues: false,
    autoCloseIssues: false,
  });
  const manual = await tool("report_issue", finding);
  assert.equal(manual.status, "pending");
  await api("/api/issues/" + manual.issueId, "PATCH", { status: "approved" });
  assert.equal((await tool("claim_next_issue")).issue.id, manual.issueId);
  assert.equal(
    (
      await tool("submit_issue_resolution", {
        issueId: manual.issueId,
        resolutionNotes: "Manual review restored",
      })
    ).status,
    "in_review",
  );
  await tool("finish_run", { runId: run.runId, status: "failed" });
  const setup = await tool("setup_project");
  assert.equal(setup.version, 0);
  await tool("save_graph_batch", {
    expectedVersion: 0,
    revision: "qa-revision-1",
    revisionCommittedAt: "2026-09-13T12:00:00.000Z",
    frontier: [],
    discoveryStatus: "complete",
    nodes: [
      {
        key: "home",
        label: "Home",
        kind: "entry",
        group: "Public",
        sourceRefs: ["src/app/page.tsx"],
      },
      {
        key: "login",
        label: "Login",
        kind: "page",
        group: "Public",
        sourceRefs: ["src/app/login/page.tsx"],
      },
    ],
    edges: [
      {
        key: "home-login",
        fromKey: "home",
        toKey: "login",
        label: "Open login",
        sourceRefs: ["src/app/page.tsx"],
      },
    ],
    journeys: [
      { key: "login-journey", name: "Open login", edgeKeys: ["home-login"] },
    ],
  });
  const claimedAudit = await tool("claim_next_audit");
  assert.ok(claimedAudit.runId);
  assert.equal((await tool("claim_next_audit")).reason, "audit_in_progress");
  await tool("report_step_result", {
    runId: claimedAudit.runId,
    order: 0,
    description: "Open login",
    status: "verified",
    notes: "src/app/page.tsx",
  });
  await tool("finish_run", { runId: claimedAudit.runId, status: "passed" });
  assert.equal((await tool("claim_next_audit")).reason, "queue_empty");
  const currentAuditState = await tool("setup_project", {
    currentRevision: "qa-revision-1",
    currentRevisionAt: "2026-09-13T12:00:00.000Z",
  });
  assert.equal(currentAuditState.nextAction, "up_to_date");
  assert.equal(currentAuditState.pendingAuditCount, 0);
  assert.equal(currentAuditState.lastAuditedRevision, "qa-revision-1");
  assert.ok(currentAuditState.lastAuditedAt);
  assert.ok(currentAuditState.lastAuditedCommitAt);
  await tool(
    "report_step_result",
    {
      runId: run.runId,
      order: 0,
      description: "late write",
      status: "verified",
    },
    true,
  );
  await api("/api/projects/" + p.id + "/regenerate-token", "POST");
  await api("/api/mcp", "POST", {}, 0, 401, {
    Authorization: "Bearer " + token,
  });
  await api("/api/auth", "DELETE");
  await api("/api/projects", "GET", undefined, 0, 401);
  await api(
    "/api/auth",
    "POST",
    { mode: "login", email: emails[0], password: "incorrect-password" },
    0,
    401,
  );
  await api("/api/auth", "POST", {
    mode: "login",
    email: emails[0],
    password: "integration-test-password",
  });
  console.log(
    "PASS: signup, login, logout, validation, cross-origin protection, tenant isolation, MCP lifecycle, approval gate, rotation",
  );
} finally {
  const users = await db.user.findMany({ where: { email: { in: emails } } });
  for (const user of users) {
    await db.project.deleteMany({ where: { workspaceId: user.workspaceId } });
    await db.user.delete({ where: { id: user.id } });
    await db.workspace.delete({ where: { id: user.workspaceId } });
  }
  await db.$disconnect();
}
