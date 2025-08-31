/*
  Warnings:

  - You are about to drop the column `issuer` on the `Asset` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `productId` to the `Asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR', 'ISSUER_ADMIN', 'COMPLIANCE_REVIEWER', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('ART', 'EMT', 'OTHER');

-- CreateEnum
CREATE TYPE "IssuerAddressStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('NA', 'REQUIRED', 'SATISFIED', 'EXCEPTION');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "country" TEXT NOT NULL,
    "jurisdiction" TEXT,
    "taxId" TEXT,
    "website" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assetClass" "AssetClass" NOT NULL DEFAULT 'OTHER',
    "policyPresets" JSONB,
    "documents" JSONB,
    "targetMarkets" TEXT[],
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuerAddress" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "ledger" "AssetLedger" NOT NULL,
    "network" "AssetNetwork" NOT NULL,
    "allowedUseTags" TEXT[],
    "status" "IssuerAddressStatus" NOT NULL DEFAULT 'PENDING',
    "proofOfControl" JSONB,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "suspendedAt" TIMESTAMP(3),
    "suspendedBy" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssuerAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regime" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementTemplate" (
    "id" TEXT NOT NULL,
    "regimeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "applicabilityExpr" TEXT NOT NULL,
    "dataPoints" TEXT[],
    "enforcementHints" JSONB,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementInstance" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "requirementTemplateId" TEXT NOT NULL,
    "status" "RequirementStatus" NOT NULL DEFAULT 'NA',
    "evidenceRefs" JSONB,
    "verifierId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rationale" TEXT,
    "exceptionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "productId" TEXT,
    "assetId" TEXT,
    "issuerAddressId" TEXT,
    "regimeId" TEXT,
    "requirementTemplateId" TEXT,
    "requirementInstanceId" TEXT,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_country_idx" ON "Organization"("country");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_createdAt_idx" ON "Organization"("createdAt");

-- CreateIndex
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");

-- CreateIndex
CREATE INDEX "Product_assetClass_idx" ON "Product"("assetClass");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "IssuerAddress_organizationId_idx" ON "IssuerAddress"("organizationId");

-- CreateIndex
CREATE INDEX "IssuerAddress_address_idx" ON "IssuerAddress"("address");

-- CreateIndex
CREATE INDEX "IssuerAddress_ledger_network_idx" ON "IssuerAddress"("ledger", "network");

-- CreateIndex
CREATE INDEX "IssuerAddress_status_idx" ON "IssuerAddress"("status");

-- CreateIndex
CREATE INDEX "IssuerAddress_createdAt_idx" ON "IssuerAddress"("createdAt");

-- CreateIndex
CREATE INDEX "Regime_name_version_idx" ON "Regime"("name", "version");

-- CreateIndex
CREATE INDEX "Regime_effectiveFrom_effectiveTo_idx" ON "Regime"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "RequirementTemplate_regimeId_idx" ON "RequirementTemplate"("regimeId");

-- CreateIndex
CREATE INDEX "RequirementTemplate_name_idx" ON "RequirementTemplate"("name");

-- CreateIndex
CREATE INDEX "RequirementTemplate_effectiveFrom_effectiveTo_idx" ON "RequirementTemplate"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "RequirementInstance_assetId_idx" ON "RequirementInstance"("assetId");

-- CreateIndex
CREATE INDEX "RequirementInstance_requirementTemplateId_idx" ON "RequirementInstance"("requirementTemplateId");

-- CreateIndex
CREATE INDEX "RequirementInstance_status_idx" ON "RequirementInstance"("status");

-- CreateIndex
CREATE INDEX "RequirementInstance_createdAt_idx" ON "RequirementInstance"("createdAt");

-- CreateIndex
CREATE INDEX "Event_organizationId_idx" ON "Event"("organizationId");

-- CreateIndex
CREATE INDEX "Event_productId_idx" ON "Event"("productId");

-- CreateIndex
CREATE INDEX "Event_assetId_idx" ON "Event"("assetId");

-- CreateIndex
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");

-- CreateIndex
CREATE INDEX "Event_userId_idx" ON "Event"("userId");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- ===== DATA MIGRATION =====

-- Create a default organization for existing users
INSERT INTO "Organization" ("id", "name", "legalName", "country", "jurisdiction", "status", "createdAt", "updatedAt")
VALUES (
    'default-org-' || gen_random_uuid()::text,
    'Default Organization',
    'Default Organization',
    'US',
    'US',
    'ACTIVE',
    NOW(),
    NOW()
);

-- Store the default organization ID for use in user migration
DO $$
DECLARE
    default_org_id TEXT;
BEGIN
    SELECT id INTO default_org_id FROM "Organization" WHERE name = 'Default Organization' LIMIT 1;
    
    -- Add organizationId column to User table
    ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
    
    -- Update all existing users to belong to the default organization
    UPDATE "User" SET "organizationId" = default_org_id;
    
    -- Make organizationId NOT NULL
    ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;
    
    -- Add status column with default value
    ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
    
    -- Convert existing role values to new enum
    ALTER TABLE "User" ADD COLUMN "role_new" "UserRole";
    UPDATE "User" SET "role_new" = CASE 
        WHEN "role" = 'admin' THEN 'ADMIN'::"UserRole"
        WHEN "role" = 'user' THEN 'VIEWER'::"UserRole"
        ELSE 'VIEWER'::"UserRole"
    END;
    
    -- Drop old role column and rename new one
    ALTER TABLE "User" DROP COLUMN "role";
    ALTER TABLE "User" RENAME COLUMN "role_new" TO "role";
END $$;

-- Handle Asset table changes
-- First, create a default product for any existing assets
INSERT INTO "Product" ("id", "organizationId", "name", "description", "assetClass", "status", "createdAt", "updatedAt")
SELECT 
    'default-product-' || gen_random_uuid()::text,
    o.id,
    'Default Product',
    'Default product for existing assets',
    'OTHER',
    'ACTIVE',
    NOW(),
    NOW()
FROM "Organization" o
WHERE o.name = 'Default Organization'
LIMIT 1;

-- Add productId column to Asset table
ALTER TABLE "Asset" ADD COLUMN "productId" TEXT;

-- Update existing assets to use the default product
UPDATE "Asset" SET "productId" = (
    SELECT p.id FROM "Product" p 
    JOIN "Organization" o ON p."organizationId" = o.id 
    WHERE o.name = 'Default Organization' 
    LIMIT 1
);

-- Make productId NOT NULL
ALTER TABLE "Asset" ALTER COLUMN "productId" SET NOT NULL;

-- Add issuingAddressId column (nullable)
ALTER TABLE "Asset" ADD COLUMN "issuingAddressId" TEXT;

-- Drop the old issuer column
ALTER TABLE "Asset" DROP COLUMN "issuer";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_issuingAddressId_fkey" FOREIGN KEY ("issuingAddressId") REFERENCES "IssuerAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuerAddress" ADD CONSTRAINT "IssuerAddress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementTemplate" ADD CONSTRAINT "RequirementTemplate_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES "Regime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementInstance" ADD CONSTRAINT "RequirementInstance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementInstance" ADD CONSTRAINT "RequirementInstance_requirementTemplateId_fkey" FOREIGN KEY ("requirementTemplateId") REFERENCES "RequirementTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementInstance" ADD CONSTRAINT "RequirementInstance_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_issuerAddressId_fkey" FOREIGN KEY ("issuerAddressId") REFERENCES "IssuerAddress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_regimeId_fkey" FOREIGN KEY ("regimeId") REFERENCES "Regime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_requirementTemplateId_fkey" FOREIGN KEY ("requirementTemplateId") REFERENCES "RequirementTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_requirementInstanceId_fkey" FOREIGN KEY ("requirementInstanceId") REFERENCES "RequirementInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Asset_productId_idx" ON "Asset"("productId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");
