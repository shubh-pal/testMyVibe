/*
  Warnings:

  - Added the required column `updatedAt` to the `Issue` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "projectId" TEXT,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fixPrompt" TEXT NOT NULL,
    "filePath" TEXT,
    "lineStart" INTEGER,
    "stepOrder" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pickedAt" DATETIME,
    "resolutionNotes" TEXT,
    "reviewNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Issue_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Issue" ("category", "createdAt", "description", "filePath", "fixPrompt", "id", "lineStart", "runId", "severity", "stepOrder", "title") SELECT "category", "createdAt", "description", "filePath", "fixPrompt", "id", "lineStart", "runId", "severity", "stepOrder", "title" FROM "Issue";
DROP TABLE "Issue";
ALTER TABLE "new_Issue" RENAME TO "Issue";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill the denormalized projectId for any issues that existed before this column.
UPDATE "Issue"
SET "projectId" = (
  SELECT "Flow"."projectId"
  FROM "Run"
  JOIN "Flow" ON "Flow"."id" = "Run"."flowId"
  WHERE "Run"."id" = "Issue"."runId"
)
WHERE "projectId" IS NULL;
