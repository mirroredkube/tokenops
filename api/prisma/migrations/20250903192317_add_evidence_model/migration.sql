/*
  Warnings:

  - The values [NA] on the enum `RequirementStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RequirementStatus_new" AS ENUM ('REQUIRED', 'SATISFIED', 'EXCEPTION');
ALTER TABLE "RequirementInstance" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "RequirementInstance" ALTER COLUMN "status" TYPE "RequirementStatus_new" USING ("status"::text::"RequirementStatus_new");
ALTER TYPE "RequirementStatus" RENAME TO "RequirementStatus_old";
ALTER TYPE "RequirementStatus_new" RENAME TO "RequirementStatus";
DROP TYPE "RequirementStatus_old";
ALTER TABLE "RequirementInstance" ALTER COLUMN "status" SET DEFAULT 'REQUIRED';
COMMIT;

-- AlterTable
ALTER TABLE "RequirementInstance" ALTER COLUMN "status" SET DEFAULT 'REQUIRED';

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "requirementInstanceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" VARCHAR(64) NOT NULL,
    "uploadPath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "tags" TEXT[],
    "metadata" JSONB,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Evidence_requirementInstanceId_idx" ON "Evidence"("requirementInstanceId");

-- CreateIndex
CREATE INDEX "Evidence_uploadedBy_idx" ON "Evidence"("uploadedBy");

-- CreateIndex
CREATE INDEX "Evidence_uploadedAt_idx" ON "Evidence"("uploadedAt");

-- CreateIndex
CREATE INDEX "Evidence_fileHash_idx" ON "Evidence"("fileHash");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_requirementInstanceId_fkey" FOREIGN KEY ("requirementInstanceId") REFERENCES "RequirementInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
