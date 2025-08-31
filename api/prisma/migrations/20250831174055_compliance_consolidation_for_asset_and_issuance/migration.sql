/*
  Warnings:

  - Made the column `status` on table `Issuance` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Issuance" ALTER COLUMN "status" SET NOT NULL;
