-- CreateIndex
CREATE INDEX "Flow_projectId_idx" ON "Flow"("projectId");

-- CreateIndex
CREATE INDEX "Issue_projectId_status_createdAt_idx" ON "Issue"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Issue_runId_idx" ON "Issue"("runId");

-- CreateIndex
CREATE INDEX "Run_flowId_startedAt_idx" ON "Run"("flowId", "startedAt");
