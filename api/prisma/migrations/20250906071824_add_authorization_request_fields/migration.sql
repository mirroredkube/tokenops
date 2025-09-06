/*
  Warnings:

  - A unique constraint covering the columns `[oneTimeToken]` on the table `Authorization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Authorization" ADD COLUMN     "authUrl" TEXT,
ADD COLUMN     "callbackUrl" TEXT,
ADD COLUMN     "currency" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "issuerAddress" TEXT,
ADD COLUMN     "oneTimeToken" TEXT,
ADD COLUMN     "requestedLimit" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Authorization_oneTimeToken_key" ON "Authorization"("oneTimeToken");

-- CreateIndex
CREATE INDEX "Authorization_oneTimeToken_idx" ON "Authorization"("oneTimeToken");

-- CreateIndex
CREATE INDEX "Authorization_expiresAt_idx" ON "Authorization"("expiresAt");

-- CreateIndex
CREATE INDEX "Authorization_currency_issuerAddress_idx" ON "Authorization"("currency", "issuerAddress");
