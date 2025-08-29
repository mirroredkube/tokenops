-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VALIDATED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Authorization" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "limit" TEXT NOT NULL,
    "txId" TEXT,
    "explorer" TEXT,
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "validatedAt" TIMESTAMP(3),
    "validatedLedgerIndex" BIGINT,
    "failureCode" TEXT,
    "noRipple" BOOLEAN NOT NULL DEFAULT false,
    "requireAuth" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Authorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Authorization_assetId_idx" ON "Authorization"("assetId");

-- CreateIndex
CREATE INDEX "Authorization_holder_idx" ON "Authorization"("holder");

-- CreateIndex
CREATE INDEX "Authorization_status_idx" ON "Authorization"("status");

-- CreateIndex
CREATE INDEX "Authorization_createdAt_idx" ON "Authorization"("createdAt");

-- AddForeignKey
ALTER TABLE "Authorization" ADD CONSTRAINT "Authorization_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
