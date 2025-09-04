-- AlterTable
ALTER TABLE "RequirementInstance" ADD COLUMN     "platformAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platformAcknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "platformAcknowledgedBy" TEXT,
ADD COLUMN     "platformAcknowledgmentReason" TEXT;

-- CreateIndex
CREATE INDEX "RequirementInstance_platformAcknowledged_idx" ON "RequirementInstance"("platformAcknowledged");

-- CreateIndex
CREATE INDEX "RequirementInstance_platformAcknowledgedBy_idx" ON "RequirementInstance"("platformAcknowledgedBy");

-- AddForeignKey
ALTER TABLE "RequirementInstance" ADD CONSTRAINT "RequirementInstance_platformAcknowledgedBy_fkey" FOREIGN KEY ("platformAcknowledgedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
