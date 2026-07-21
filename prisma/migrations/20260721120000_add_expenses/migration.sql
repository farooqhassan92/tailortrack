CREATE TYPE "ExpenseCategory" AS ENUM (
  'RENT',
  'ELECTRICITY',
  'STAFF',
  'TRANSPORT',
  'REPAIRS',
  'SUPPLIES',
  'MISC'
);

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "category" "ExpenseCategory" NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "spentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Expense_category_idx" ON "Expense"("category");
CREATE INDEX "Expense_spentAt_idx" ON "Expense"("spentAt");
