-- AlterTable
ALTER TABLE "Issuance" ADD COLUMN     "failureCode" TEXT,
ADD COLUMN     "validatedAt" TIMESTAMP(3),
ADD COLUMN     "validatedLedgerIndex" BIGINT;
