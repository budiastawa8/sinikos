-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('CALENDAR_PRORATA', 'ANNIVERSARY');

-- AlterEnum: PENDING before ACTIVE for check-in menunggu pelunasan
ALTER TYPE "LeaseStatus" ADD VALUE IF NOT EXISTS 'PENDING';

-- AlterTable Organization
ALTER TABLE "Organization" ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'CALENDAR_PRORATA';

-- AlterTable Lease
ALTER TABLE "Lease" ADD COLUMN "billingAnchorDay" INTEGER NOT NULL DEFAULT 1;

-- Backfill anchor dari tanggal mulai (maks 28)
UPDATE "Lease"
SET "billingAnchorDay" = LEAST(
  28,
  GREATEST(1, EXTRACT(DAY FROM "startDate")::INTEGER)
);

-- Kontrak lama yang sudah ACTIVE tetap ACTIVE; default Prisma PENDING hanya untuk row baru
-- (kolom status tidak diubah)

CREATE INDEX "Lease_billingAnchorDay_idx" ON "Lease"("billingAnchorDay");
