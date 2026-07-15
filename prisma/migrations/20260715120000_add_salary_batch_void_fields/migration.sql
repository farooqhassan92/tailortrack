ALTER TABLE "TailorSalaryBatch"
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidReason" TEXT;

CREATE INDEX "TailorSalaryBatch_voidedAt_idx" ON "TailorSalaryBatch"("voidedAt");
