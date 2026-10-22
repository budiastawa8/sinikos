-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_organizationId_status_createdAt_idx" ON "WhatsAppMessageLog"("organizationId", "status", "createdAt");
