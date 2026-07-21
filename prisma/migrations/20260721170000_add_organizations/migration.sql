CREATE TYPE "OrganizationRole" AS ENUM ('ADMIN');

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL DEFAULT 'ADMIN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Organization" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('default_org', 'Default Organization', 'default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "Customer" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "CustomerMeasurement" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Product" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "InventoryMovement" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Tailor" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "StitchingOrder" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "TailorSalaryBatch" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "organizationId" TEXT;

UPDATE "Customer" SET "organizationId" = 'default_org';
UPDATE "CustomerMeasurement" SET "organizationId" = 'default_org';
UPDATE "Product" SET "organizationId" = 'default_org';
UPDATE "InventoryMovement" SET "organizationId" = 'default_org';
UPDATE "Sale" SET "organizationId" = 'default_org';
UPDATE "Tailor" SET "organizationId" = 'default_org';
UPDATE "StitchingOrder" SET "organizationId" = 'default_org';
UPDATE "TailorSalaryBatch" SET "organizationId" = 'default_org';
UPDATE "Expense" SET "organizationId" = 'default_org';

ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "CustomerMeasurement" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "InventoryMovement" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Tailor" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "StitchingOrder" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "TailorSalaryBatch" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Expense" ALTER COLUMN "organizationId" SET NOT NULL;

DROP INDEX IF EXISTS "Customer_phone_key";
DROP INDEX IF EXISTS "Product_sku_key";

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");
CREATE UNIQUE INDEX "Customer_organizationId_phone_key" ON "Customer"("organizationId", "phone");
CREATE INDEX "CustomerMeasurement_organizationId_idx" ON "CustomerMeasurement"("organizationId");
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");
CREATE UNIQUE INDEX "Product_organizationId_sku_key" ON "Product"("organizationId", "sku");
CREATE INDEX "InventoryMovement_organizationId_idx" ON "InventoryMovement"("organizationId");
CREATE INDEX "Sale_organizationId_idx" ON "Sale"("organizationId");
CREATE INDEX "Tailor_organizationId_idx" ON "Tailor"("organizationId");
CREATE INDEX "StitchingOrder_organizationId_idx" ON "StitchingOrder"("organizationId");
CREATE INDEX "TailorSalaryBatch_organizationId_idx" ON "TailorSalaryBatch"("organizationId");
CREATE INDEX "Expense_organizationId_idx" ON "Expense"("organizationId");

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerMeasurement" ADD CONSTRAINT "CustomerMeasurement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Tailor" ADD CONSTRAINT "Tailor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StitchingOrder" ADD CONSTRAINT "StitchingOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TailorSalaryBatch" ADD CONSTRAINT "TailorSalaryBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
