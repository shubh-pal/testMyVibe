/*
  Warnings:

  - Made the column `projectId` on table `Issue` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "autoApprove" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "issueType" TEXT NOT NULL DEFAULT 'task',
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "planSummary" TEXT,
ADD COLUMN     "planningStatus" TEXT NOT NULL DEFAULT 'not_required',
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'audit',
ALTER COLUMN "runId" DROP NOT NULL,
ALTER COLUMN "projectId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
