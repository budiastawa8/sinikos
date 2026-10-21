-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "midtransOrderId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "paymentUrl" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "providerRef" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_midtransOrderId_key" ON "Invoice"("midtransOrderId");
