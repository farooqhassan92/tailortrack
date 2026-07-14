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

export async function createInventorySale(formData: FormData) {
  const productId = readString(formData, "productId");
  const customerId = readString(formData, "customerId") || null;
  const quantity = readDecimal(formData, "quantity");
  const discount = readDecimal(formData, "discount");
  const paidAmount = readDecimal(formData, "paidAmount");
  const paymentMethod = readString(formData, "paymentMethod") || "CASH";
  const note = readString(formData, "note");

  if (!productId || quantity.lte(0)) {
    redirect(salesPath("missing"));
  }

  const product = await prisma.product.findFirst({
    where: {
      archivedAt: null,
      id: productId
    }
  });

  if (!product || product.type === "STITCHING_SERVICE") {
    redirect(salesPath("invalid-product"));
  }

  if (product.quantityOnHand.lt(quantity)) {
    redirect(salesPath("insufficient-stock"));
  }

  const invoiceNumber = makeInvoiceNumber();
  const subtotal = product.sellingPrice.mul(quantity);
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
        total,
        items: {
          create: {
            description: `${product.name}${product.sku ? ` (${product.sku})` : ""}`,
            productId: product.id,
            quantity,
            total: subtotal,
            unitPrice: product.sellingPrice
          }
        }
      }
    });

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
  });

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect(salesPath("created"));
}
