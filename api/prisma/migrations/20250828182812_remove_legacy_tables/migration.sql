/*
  Warnings:

  - You are about to drop the `Token` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TokenEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TokenRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TokenEvent" DROP CONSTRAINT "TokenEvent_tokenId_fkey";

-- DropTable
DROP TABLE "Token";

-- DropTable
DROP TABLE "TokenEvent";

-- DropTable
DROP TABLE "TokenRecord";
