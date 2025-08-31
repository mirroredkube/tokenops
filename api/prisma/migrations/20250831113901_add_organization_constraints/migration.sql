/*
  Warnings:

  - You are about to alter the column `name` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `legalName` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `country` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `Char(2)`.
  - You are about to alter the column `jurisdiction` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `taxId` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `website` on the `Organization` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - A unique constraint covering the columns `[name]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organization" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "legalName" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "country" SET DATA TYPE CHAR(2),
ALTER COLUMN "jurisdiction" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "taxId" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "website" SET DATA TYPE VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_name_key" ON "Organization"("name");
