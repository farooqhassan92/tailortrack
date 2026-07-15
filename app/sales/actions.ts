"use server";

import { Prisma } from "@prisma/client";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readDecimal(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? new Prisma.Decimal(value) : new Prisma.Decimal(0);
}

function salesPath(status: string): Route {
  return `/sales?status=${status}` as Route;
}

function makeInvoiceNumber() {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();

  return `INV-${datePart}-${suffix}`;
}

function makeStitchingOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `ST-${stamp}-${suffix}`;
}

export async function createInventorySale(formData: FormData) {
  const productId = readString(formData, "productId");
  const customerId = readString(formData, "customerId") || null;
  const quantity = readDecimal(formData, "quantity");
  const garmentType = readString(formData, "garmentType");
  const stitchingCharge = readDecimal(formData, "stitchingCharge");
  const dueDateValue = readString(formData, "dueDate");
  const styleNotes = readString(formData, "styleNotes") || null;
  const discount = readDecimal(formData, "discount");
  const paidAmount = readDecimal(formData, "paidAmount");
  const paymentMethod = readString(formData, "paymentMethod") || "CASH";
  const note = readString(formData, "note");
  const hasInventoryLine = Boolean(productId) && quantity.gt(0);
  const hasStitchingLine = Boolean(garmentType) && stitchingCharge.gt(0);

  if (!hasInventoryLine && !hasStitchingLine) {
    redirect(salesPath("missing"));
  }

  if (hasStitchingLine && !customerId) {
    redirect(salesPath("customer-required"));
  }

  const product = hasInventoryLine
    ? await prisma.product.findFirst({
        where: {
          archivedAt: null,
          id: productId
        }
      })
    : null;

  if (hasInventoryLine && (!product || product.type === "STITCHING_SERVICE")) {
    redirect(salesPath("invalid-product"));
  }

  if (product && product.quantityOnHand.lt(quantity)) {
    redirect(salesPath("insufficient-stock"));
  }

  const invoiceNumber = makeInvoiceNumber();
  const inventorySubtotal = product ? product.sellingPrice.mul(quantity) : new Prisma.Decimal(0);
  const subtotal = inventorySubtotal.add(hasStitchingLine ? stitchingCharge : 0);
  const safeDiscount = Prisma.Decimal.min(discount, subtotal);
  const total = subtotal.sub(safeDiscount);
  const safePaidAmount = Prisma.Decimal.min(paidAmount, total);
  const paymentStatus = safePaidAmount.isZero()
    ? "UNPAID"
    : safePaidAmount.lt(total)
      ? "PARTIAL"
      : "PAID";

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        customerId,
        discount: safeDiscount,
        invoiceNumber,
        paidAmount: safePaidAmount,
        paymentStatus,
        subtotal,
        total
      }
    });

    if (product) {
      await tx.saleItem.create({
        data: {
          description: `${product.name}${product.sku ? ` (${product.sku})` : ""}`,
          productId: product.id,
          quantity,
          saleId: sale.id,
          total: inventorySubtotal,
          unitPrice: product.sellingPrice
        }
      });

      await tx.product.update({
        data: {
          quantityOnHand: {
            decrement: quantity
          }
        },
        where: {
          id: product.id
        }
      });

      await tx.inventoryMovement.create({
        data: {
          note: `Sold on ${invoiceNumber}${note ? ` - ${note}` : ""}`,
          productId: product.id,
          quantity: quantity.mul(-1),
          type: "SALE"
        }
      });
    }

    if (hasStitchingLine && customerId) {
      const stitchingOrder = await tx.stitchingOrder.create({
        data: {
          customerId,
          dueDate: dueDateValue ? new Date(dueDateValue) : null,
          garmentType,
          orderNumber: makeStitchingOrderNumber(),
          stitchingCharge,
          styleNotes
        }
      });

      await tx.saleItem.create({
        data: {
          description: `${garmentType} stitching`,
          quantity: new Prisma.Decimal(1),
          saleId: sale.id,
          stitchingOrderId: stitchingOrder.id,
          total: stitchingCharge,
          unitPrice: stitchingCharge
        }
      });
    }

    if (!safePaidAmount.isZero()) {
      await tx.payment.create({
        data: {
          amount: safePaidAmount,
          method: paymentMethod as "CASH" | "CARD" | "BANK_TRANSFER" | "OTHER",
          note: note || `Payment for ${invoiceNumber}`,
          saleId: sale.id
        }
      });
    }
  });

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/stitching-orders");
  redirect(salesPath("created"));
}
