/*
  Warnings:

  - You are about to drop the `ComplianceRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ComplianceRecord" DROP CONSTRAINT "ComplianceRecord_assetId_fkey";

-- AlterTable
ALTER TABLE "Issuance" ADD COLUMN     "complianceEvaluated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "complianceStatus" TEXT;

-- AlterTable
ALTER TABLE "RequirementInstance" ADD COLUMN     "holder" TEXT,
ADD COLUMN     "issuanceId" TEXT,
ADD COLUMN     "transferAmount" TEXT,
ADD COLUMN     "transferType" TEXT;

-- DropTable
DROP TABLE "ComplianceRecord";

-- DropEnum
DROP TYPE "ComplianceStatus";

-- CreateIndex
CREATE INDEX "Issuance_complianceStatus_idx" ON "Issuance"("complianceStatus");

-- CreateIndex
CREATE INDEX "RequirementInstance_issuanceId_idx" ON "RequirementInstance"("issuanceId");

-- CreateIndex
CREATE INDEX "RequirementInstance_holder_idx" ON "RequirementInstance"("holder");

-- AddForeignKey
ALTER TABLE "RequirementInstance" ADD CONSTRAINT "RequirementInstance_issuanceId_fkey" FOREIGN KEY ("issuanceId") REFERENCES "Issuance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
