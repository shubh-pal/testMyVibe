-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "confidence" TEXT,
ADD COLUMN     "moduleId" TEXT;

-- CreateTable
CREATE TABLE "ApplicationModule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'application',
    "description" TEXT,
    "sourceRefs" TEXT NOT NULL DEFAULT '[]',
    "revision" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "leaseUntil" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicationModule_projectId_reviewStatus_updatedAt_idx" ON "ApplicationModule"("projectId", "reviewStatus", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationModule_projectId_name_key" ON "ApplicationModule"("projectId", "name");

-- CreateIndex
CREATE INDEX "Issue_moduleId_createdAt_idx" ON "Issue"("moduleId", "createdAt");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ApplicationModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationModule" ADD CONSTRAINT "ApplicationModule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
