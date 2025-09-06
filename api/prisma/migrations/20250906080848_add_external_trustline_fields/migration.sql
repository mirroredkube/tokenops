-- AlterTable
ALTER TABLE "Authorization" ADD COLUMN     "external" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "externalSource" TEXT;
