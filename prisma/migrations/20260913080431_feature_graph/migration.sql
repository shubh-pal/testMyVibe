-- CreateTable
CREATE TABLE "GraphState" (
    "projectId" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL DEFAULT 0,
    "revision" TEXT NOT NULL DEFAULT '',
    "frontier" TEXT NOT NULL DEFAULT '[]',
    "discoveryStatus" TEXT NOT NULL DEFAULT 'pending',
    "leaseRunId" TEXT,
    "leaseUntil" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GraphState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraphNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "sourceRefs" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    CONSTRAINT "GraphNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraphEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fromKey" TEXT NOT NULL,
    "toKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sourceRefs" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    CONSTRAINT "GraphEdge_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraphJourney" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "edgeKeys" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "revision" TEXT NOT NULL,
    "auditedAt" DATETIME,
    CONSTRAINT "GraphJourney_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GraphJourney_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "summary" TEXT,
    "graphRevision" TEXT,
    "evidenceType" TEXT NOT NULL DEFAULT 'source',
    CONSTRAINT "Run_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Run" ("finishedAt", "flowId", "id", "startedAt", "status", "summary") SELECT "finishedAt", "flowId", "id", "startedAt", "status", "summary" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "GraphNode_projectId_group_idx" ON "GraphNode"("projectId", "group");

-- CreateIndex
CREATE UNIQUE INDEX "GraphNode_projectId_key_key" ON "GraphNode"("projectId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "GraphEdge_projectId_key_key" ON "GraphEdge"("projectId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "GraphJourney_flowId_key" ON "GraphJourney"("flowId");

-- CreateIndex
CREATE INDEX "GraphJourney_projectId_status_idx" ON "GraphJourney"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GraphJourney_projectId_key_key" ON "GraphJourney"("projectId", "key");
