/*
  Warnings:

  - The values [PENDING,SUBMITTED,VALIDATED,FAILED,EXPIRED] on the enum `AuthorizationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `authUrl` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `callbackUrl` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `explorer` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `failureCode` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `holder` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `issuerAddress` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `noRipple` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `oneTimeToken` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `requestedLimit` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `requireAuth` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `txId` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `validatedAt` on the `Authorization` table. All the data in the column will be lost.
  - You are about to drop the column `validatedLedgerIndex` on the `Authorization` table. All the data in the column will be lost.
  - Added the required column `holderAddress` to the `Authorization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `initiatedBy` to the `Authorization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ledger` to the `Authorization` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `Authorization` table without a default value. This is not possible if the table is not empty.
  - Made the column `currency` on table `Authorization` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "AuthorizationInitiator" AS ENUM ('HOLDER', 'ISSUER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AuthorizationRequestStatus" AS ENUM ('INVITED', 'CONSUMED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "AuthorizationStatus_new" AS ENUM ('HOLDER_REQUESTED', 'ISSUER_AUTHORIZED', 'EXTERNAL', 'LIMIT_UPDATED', 'TRUSTLINE_CLOSED', 'FROZEN', 'UNFROZEN');
ALTER TABLE "Authorization" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Authorization" ALTER COLUMN "status" TYPE "AuthorizationStatus_new" USING ("status"::text::"AuthorizationStatus_new");
ALTER TYPE "AuthorizationStatus" RENAME TO "AuthorizationStatus_old";
ALTER TYPE "AuthorizationStatus_new" RENAME TO "AuthorizationStatus";
DROP TYPE "AuthorizationStatus_old";
COMMIT;

-- DropIndex
DROP INDEX "Authorization_assetId_idx";

-- DropIndex
DROP INDEX "Authorization_currency_issuerAddress_idx";

-- DropIndex
DROP INDEX "Authorization_expiresAt_idx";

-- DropIndex
DROP INDEX "Authorization_holder_idx";

-- DropIndex
DROP INDEX "Authorization_oneTimeToken_idx";

-- DropIndex
DROP INDEX "Authorization_oneTimeToken_key";

-- First, add new columns with default values
ALTER TABLE "Authorization" 
ADD COLUMN "holderAddress" TEXT,
ADD COLUMN "initiatedBy" "AuthorizationInitiator",
ADD COLUMN "ledger" TEXT,
ADD COLUMN "tenantId" TEXT,
ADD COLUMN "txHash" VARCHAR(64);

-- Update existing rows with default values
UPDATE "Authorization" SET 
  "holderAddress" = COALESCE("holder", 'legacy-holder'),
  "initiatedBy" = 'SYSTEM',
  "ledger" = 'XRPL-Testnet',
  "tenantId" = (SELECT p."organizationId" FROM "Asset" a JOIN "Product" p ON a."productId" = p."id" WHERE a."id" = "Authorization"."assetId" LIMIT 1),
  "txHash" = "txId"
WHERE "holderAddress" IS NULL;

-- Make columns NOT NULL after populating them
ALTER TABLE "Authorization" 
ALTER COLUMN "holderAddress" SET NOT NULL,
ALTER COLUMN "initiatedBy" SET NOT NULL,
ALTER COLUMN "ledger" SET NOT NULL,
ALTER COLUMN "tenantId" SET NOT NULL;

-- Drop old columns
ALTER TABLE "Authorization" DROP COLUMN "authUrl",
DROP COLUMN "callbackUrl",
DROP COLUMN "expiresAt",
DROP COLUMN "explorer",
DROP COLUMN "failureCode",
DROP COLUMN "holder",
DROP COLUMN "issuerAddress",
DROP COLUMN "metadata",
DROP COLUMN "noRipple",
DROP COLUMN "oneTimeToken",
DROP COLUMN "requestedLimit",
DROP COLUMN "requireAuth",
DROP COLUMN "txId",
DROP COLUMN "updatedAt",
DROP COLUMN "validatedAt",
DROP COLUMN "validatedLedgerIndex";

-- Make currency NOT NULL
ALTER TABLE "Authorization" ALTER COLUMN "currency" SET NOT NULL;

-- CreateTable
CREATE TABLE "AuthorizationRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "holderAddress" TEXT NOT NULL,
    "requestedLimit" TEXT NOT NULL,
    "oneTimeTokenHash" TEXT NOT NULL,
    "authUrl" TEXT NOT NULL,
    "status" "AuthorizationRequestStatus" NOT NULL DEFAULT 'INVITED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthorizationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthorizationRequest_tenantId_assetId_holderAddress_idx" ON "AuthorizationRequest"("tenantId", "assetId", "holderAddress");

-- CreateIndex
CREATE INDEX "Authorization_tenantId_assetId_holderAddress_idx" ON "Authorization"("tenantId", "assetId", "holderAddress");

-- CreateIndex
CREATE INDEX "Authorization_tenantId_ledger_currency_holderAddress_idx" ON "Authorization"("tenantId", "ledger", "currency", "holderAddress");
