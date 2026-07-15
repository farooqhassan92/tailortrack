ALTER TABLE "Customer" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Customer_archivedAt_idx" ON "Customer"("archivedAt");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
