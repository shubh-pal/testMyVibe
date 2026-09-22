-- Add a stable key for scheduler-created issues. PostgreSQL permits multiple
-- NULL values here, so audit issues without a scheduler fingerprint remain
-- unaffected while each project can have only one matching scheduled issue.
ALTER TABLE "Issue" ADD COLUMN "fingerprint" TEXT;

CREATE UNIQUE INDEX "Issue_projectId_fingerprint_key"
  ON "Issue"("projectId", "fingerprint");
