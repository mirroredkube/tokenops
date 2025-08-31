/*
  Warnings:

  - You are about to drop the column `failureCode` on the `Issuance` table. All the data in the column will be lost.
  - You are about to drop the column `to` on the `Issuance` table. All the data in the column will be lost.
  - You are about to drop the column `validatedAt` on the `Issuance` table. All the data in the column will be lost.
  - You are about to drop the column `validatedLedgerIndex` on the `Issuance` table. All the data in the column will be lost.
  - The `status` column on the `Issuance` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "IssuanceStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VALIDATED', 'FAILED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "Issuance" DROP CONSTRAINT "Issuance_assetId_fkey";

-- DropIndex
DROP INDEX "Issuance_assetId_idx";

-- DropIndex
DROP INDEX "Issuance_complianceStatus_idx";

-- DropIndex
DROP INDEX "Issuance_createdAt_idx";

-- DropIndex
DROP INDEX "Issuance_status_idx";

-- AlterTable
ALTER TABLE "Authorization" ADD COLUMN     "issuanceId" TEXT;

-- AlterTable
-- First add holder column as nullable
ALTER TABLE "Issuance" ADD COLUMN     "holder" TEXT;

-- Update existing records to use 'to' field value as holder
UPDATE "Issuance" SET "holder" = "to" WHERE "holder" IS NULL;

-- Now make holder NOT NULL
ALTER TABLE "Issuance" ALTER COLUMN "holder" SET NOT NULL;

-- Add new columns
ALTER TABLE "Issuance" ADD COLUMN     "manifestHash" VARCHAR(66),
ADD COLUMN     "manifestVersion" TEXT NOT NULL DEFAULT '1.0';

-- Update anchor default
ALTER TABLE "Issuance" ALTER COLUMN "anchor" SET DEFAULT false;

-- Handle status column migration
-- First create a temporary column with the new enum type
ALTER TABLE "Issuance" ADD COLUMN "status_new" "IssuanceStatus";

-- Update existing status values
UPDATE "Issuance" SET "status_new" = 
  CASE 
    WHEN "status" = 'pending' THEN 'PENDING'::"IssuanceStatus"
    WHEN "status" = 'submitted' THEN 'SUBMITTED'::"IssuanceStatus"
    WHEN "status" = 'validated' THEN 'VALIDATED'::"IssuanceStatus"
    WHEN "status" = 'failed' THEN 'FAILED'::"IssuanceStatus"
    WHEN "status" = 'expired' THEN 'EXPIRED'::"IssuanceStatus"
    ELSE 'PENDING'::"IssuanceStatus"
  END;

-- Drop old status column and rename new one
ALTER TABLE "Issuance" DROP COLUMN "status";
ALTER TABLE "Issuance" RENAME COLUMN "status_new" TO "status";

-- Set default for status
ALTER TABLE "Issuance" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- Drop old columns
ALTER TABLE "Issuance" DROP COLUMN "failureCode",
DROP COLUMN "to",
DROP COLUMN "validatedAt",
DROP COLUMN "validatedLedgerIndex";

-- CreateIndex
CREATE INDEX "Authorization_issuanceId_idx" ON "Authorization"("issuanceId");

-- CreateIndex
CREATE INDEX "Issuance_manifestHash_idx" ON "Issuance"("manifestHash");

-- AddForeignKey
ALTER TABLE "Issuance" ADD CONSTRAINT "Issuance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authorization" ADD CONSTRAINT "Authorization_issuanceId_fkey" FOREIGN KEY ("issuanceId") REFERENCES "Issuance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
