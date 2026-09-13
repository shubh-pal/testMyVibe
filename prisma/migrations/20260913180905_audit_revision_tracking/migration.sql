-- AlterTable
ALTER TABLE "GraphState" ADD COLUMN "lastAuditedAt" DATETIME;
ALTER TABLE "GraphState" ADD COLUMN "lastAuditedCommitAt" DATETIME;
ALTER TABLE "GraphState" ADD COLUMN "lastAuditedRevision" TEXT;
ALTER TABLE "GraphState" ADD COLUMN "revisionCommittedAt" DATETIME;
