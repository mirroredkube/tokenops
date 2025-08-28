-- CreateEnum
CREATE TYPE "AssetLedger" AS ENUM ('XRPL', 'HEDERA', 'ETHEREUM');

-- CreateEnum
CREATE TYPE "AssetNetwork" AS ENUM ('MAINNET', 'TESTNET', 'DEVNET');

-- CreateEnum
CREATE TYPE "ComplianceMode" AS ENUM ('OFF', 'RECORD_ONLY', 'GATED_BEFORE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'RETIRED');

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetRef" TEXT NOT NULL,
    "ledger" "AssetLedger" NOT NULL,
    "network" "AssetNetwork" NOT NULL,
    "issuer" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "complianceMode" "ComplianceMode" NOT NULL DEFAULT 'RECORD_ONLY',
    "controls" JSONB,
    "registry" JSONB,
    "metadata" JSONB,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issuance" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "complianceRef" JSONB,
    "anchor" BOOLEAN NOT NULL DEFAULT true,
    "txId" TEXT,
    "explorer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issuance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetRef_key" ON "Asset"("assetRef");

-- CreateIndex
CREATE INDEX "Asset_ledger_network_idx" ON "Asset"("ledger", "network");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_createdAt_idx" ON "Asset"("createdAt");

-- CreateIndex
CREATE INDEX "Issuance_assetId_idx" ON "Issuance"("assetId");

-- CreateIndex
CREATE INDEX "Issuance_status_idx" ON "Issuance"("status");

-- CreateIndex
CREATE INDEX "Issuance_createdAt_idx" ON "Issuance"("createdAt");

-- AddForeignKey
ALTER TABLE "Issuance" ADD CONSTRAINT "Issuance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
