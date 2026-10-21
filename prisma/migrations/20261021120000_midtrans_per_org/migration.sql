-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "midtransEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "midtransIsProduction" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "midtransServerKeyEnc" TEXT;
ALTER TABLE "Organization" ADD COLUMN "midtransClientKeyEnc" TEXT;
