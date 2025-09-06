/*
  Warnings:

  - A unique constraint covering the columns `[tenantId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[subdomain]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subdomain` to the `Organization` table without a default value. This is not possible if the table is not empty.
  - The required column `tenantId` was added to the `Organization` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- Add columns as nullable first
ALTER TABLE "Organization" ADD COLUMN "subdomain" TEXT,
ADD COLUMN "tenantId" TEXT;

-- Populate existing organizations with subdomain and tenantId
UPDATE "Organization" SET 
  "subdomain" = CASE 
    WHEN "name" = 'Default Organization' THEN 'default'
    WHEN "name" = 'Asset Manager 1' THEN 'am1'
    ELSE 'org-' || "id"
  END,
  "tenantId" = gen_random_uuid()::text
WHERE "subdomain" IS NULL;

-- Make columns NOT NULL
ALTER TABLE "Organization" ALTER COLUMN "subdomain" SET NOT NULL;
ALTER TABLE "Organization" ALTER COLUMN "tenantId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_tenantId_key" ON "Organization"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_subdomain_key" ON "Organization"("subdomain");

-- CreateIndex
CREATE INDEX "Organization_subdomain_idx" ON "Organization"("subdomain");

-- CreateIndex
CREATE INDEX "Organization_tenantId_idx" ON "Organization"("tenantId");
