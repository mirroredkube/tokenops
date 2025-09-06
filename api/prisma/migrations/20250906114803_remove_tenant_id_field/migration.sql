/*
  Warnings:

  - You are about to drop the column `tenantId` on the `Organization` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Organization_tenantId_idx";

-- DropIndex
DROP INDEX "Organization_tenantId_key";

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "tenantId";
