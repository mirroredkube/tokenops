-- CreateEnum
CREATE TYPE "Ledger" AS ENUM ('XRPL_TESTNET', 'XRPL_MAINNET');

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenEvent" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ledgerTxHash" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenRecord" (
    "id" TEXT NOT NULL,
    "ledger" "Ledger" NOT NULL,
    "symbol" TEXT NOT NULL,
    "supply" TEXT NOT NULL,
    "issuerAddress" TEXT NOT NULL,
    "holderAddress" TEXT,
    "txHash" TEXT NOT NULL,
    "compliance" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenEvent_tokenId_idx" ON "TokenEvent"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenRecord_txHash_key" ON "TokenRecord"("txHash");

-- CreateIndex
CREATE INDEX "TokenRecord_symbol_ledger_idx" ON "TokenRecord"("symbol", "ledger");

-- CreateIndex
CREATE INDEX "TokenRecord_createdAt_idx" ON "TokenRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "TokenEvent" ADD CONSTRAINT "TokenEvent_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token"("id") ON DELETE CASCADE ON UPDATE CASCADE;
