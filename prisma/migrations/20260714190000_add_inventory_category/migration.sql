ALTER TABLE "Product" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'UNSTITCHED_ROLLS';

CREATE INDEX "Product_category_idx" ON "Product"("category");
