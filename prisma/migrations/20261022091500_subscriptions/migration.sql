-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "plan" "PlanCode" NOT NULL DEFAULT 'FREE';
ALTER TABLE "Organization" ADD COLUMN "planExpiresAt" TIMESTAMP(3);

-- Organisasi yang sudah ada tetap Pro 30 hari agar operasional berjalan tidak terputus.
UPDATE "Organization"
SET "plan" = 'PRO',
    "planExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '30 days';

-- CreateIndex
CREATE INDEX "Organization_plan_planExpiresAt_idx" ON "Organization"("plan", "planExpiresAt");

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" "PlanCode" NOT NULL DEFAULT 'PRO',
    "period" "BillingPeriod" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" INTEGER NOT NULL,
    "midtransOrderId" TEXT,
    "paymentUrl" TEXT,
    "providerRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_midtransOrderId_key" ON "Subscription"("midtransOrderId");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
