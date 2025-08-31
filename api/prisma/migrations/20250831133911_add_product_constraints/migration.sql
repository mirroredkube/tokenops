/*
  Warnings:

  - You are about to alter the column `name` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `description` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - A unique constraint covering the columns `[organizationId,name]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500);

-- CreateIndex
CREATE UNIQUE INDEX "Product_organizationId_name_key" ON "Product"("organizationId", "name");
