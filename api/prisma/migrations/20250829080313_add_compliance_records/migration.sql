-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED');

-- DropEnum
DROP TYPE "Ledger";

-- CreateTable
CREATE TABLE "ComplianceRecord" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "reason" TEXT,
    "isin" TEXT,
    "legalIssuer" TEXT,
    "jurisdiction" TEXT,
    "micaClass" TEXT,
    "kycRequirement" TEXT,
    "transferRestrictions" BOOLEAN NOT NULL DEFAULT false,
    "purpose" TEXT,
    "docs" JSONB,
    "consentTs" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRecord_recordId_key" ON "ComplianceRecord"("recordId");

-- CreateIndex
CREATE INDEX "ComplianceRecord_assetId_idx" ON "ComplianceRecord"("assetId");

-- CreateIndex
CREATE INDEX "ComplianceRecord_status_idx" ON "ComplianceRecord"("status");

-- CreateIndex
CREATE INDEX "ComplianceRecord_holder_idx" ON "ComplianceRecord"("holder");

-- CreateIndex
CREATE INDEX "ComplianceRecord_createdAt_idx" ON "ComplianceRecord"("createdAt");

-- CreateIndex
CREATE INDEX "ComplianceRecord_recordId_idx" ON "ComplianceRecord"("recordId");

-- AddForeignKey
ALTER TABLE "ComplianceRecord" ADD CONSTRAINT "ComplianceRecord_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
