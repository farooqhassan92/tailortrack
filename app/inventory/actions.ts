"use server";

import { Prisma } from "@prisma/client";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const productTypePrefixes = {
  READYMADE: "RDY",
  UNSTITCHED: "FAB",
  STITCHING_SERVICE: "SRV"
} as const;

const categoryDefaults = {
  UNSTITCHED_ROLLS: {
    type: "UNSTITCHED",
    unit: "meter"
  },
  UNSTITCHED_BOXES: {
    type: "UNSTITCHED",
    unit: "box"
  },
  SUITING: {
    type: "UNSTITCHED",
    unit: "meter"
  },
  READYMADE: {
    type: "READYMADE",
    unit: "piece"
  },
  ACCESSORIES: {
    type: "READYMADE",
    unit: "piece"
  },
  SERVICES: {
    type: "STITCHING_SERVICE",
    unit: "service"
  }
} as const;

const movementLabels = {
  STOCK_IN: "Stock in",
  SALE: "Stock out",
  RETURN: "Return",
  ADJUSTMENT: "Adjustment"
} as const;

function inventoryCategoryPath(category: keyof typeof categoryDefaults): Route {
  return `/inventory?category=${category}` as Route;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readDecimal(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? new Prisma.Decimal(value) : new Prisma.Decimal(0);
}

function makeInternalCode(type: keyof typeof productTypePrefixes) {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${productTypePrefixes[type]}-${stamp}-${suffix}`;
}

export async function createInventoryItem(formData: FormData) {
  const category = readString(formData, "category") as keyof typeof categoryDefaults;
  const selectedCategory = categoryDefaults[category] ? category : "UNSTITCHED_ROLLS";
  const categoryConfig = categoryDefaults[selectedCategory];
  const type = categoryConfig.type as keyof typeof productTypePrefixes;
  const name = readString(formData, "name");
  const providedSku = readString(formData, "sku");
  const quantity = readDecimal(formData, "quantity");

  if (!name || !productTypePrefixes[type]) {
    return;
  }

  const sku = providedSku || makeInternalCode(type);
  const unit = readString(formData, "unit") || categoryConfig.unit;
  const color = readString(formData, "color") || null;
  const size = readString(formData, "size") || null;
  const fabricType = readString(formData, "fabricType") || null;
  const costPrice = readDecimal(formData, "costPrice");
  const sellingPrice = readDecimal(formData, "sellingPrice");

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        color,
        category: selectedCategory,
        costPrice,
        fabricType,
        name,
        quantityOnHand: quantity,
        sellingPrice,
        size,
        sku,
        type,
        unit
      }
    });

    if (!quantity.isZero()) {
      await tx.inventoryMovement.create({
        data: {
          note: "Opening stock",
          productId: product.id,
          quantity,
          type: "STOCK_IN"
        }
      });
    }
  });

  revalidatePath("/inventory");
  redirect(inventoryCategoryPath(selectedCategory));
}

export async function recordInventoryMovement(formData: FormData) {
  const productId = readString(formData, "productId");
  const type = readString(formData, "type") as keyof typeof movementLabels;
  const quantity = readDecimal(formData, "quantity");
  const note = readString(formData, "note") || null;

  if (!productId || !movementLabels[type] || quantity.lte(0)) {
    return;
  }

  const quantityDelta =
    type === "SALE" ? quantity.mul(-1) : type === "ADJUSTMENT" ? quantity : quantity;

  await prisma.$transaction([
    prisma.product.update({
      data: {
        quantityOnHand: {
          increment: quantityDelta
        }
      },
      where: {
        id: productId
      }
    }),
    prisma.inventoryMovement.create({
      data: {
        note,
        productId,
        quantity: quantityDelta,
        type
      }
    })
  ]);

  revalidatePath("/inventory");
}

export async function updateInventoryItem(formData: FormData) {
  const productId = readString(formData, "productId");
  const category = readString(formData, "category") as keyof typeof categoryDefaults;
  const selectedCategory = categoryDefaults[category] ? category : "UNSTITCHED_ROLLS";
  const categoryConfig = categoryDefaults[selectedCategory];
  const type = categoryConfig.type as keyof typeof productTypePrefixes;
  const name = readString(formData, "name");

  if (!productId || !name || !productTypePrefixes[type]) {
    return;
  }

  const sku = readString(formData, "sku") || null;
  const unit = readString(formData, "unit") || categoryConfig.unit;
  const color = readString(formData, "color") || null;
  const size = readString(formData, "size") || null;
  const fabricType = readString(formData, "fabricType") || null;
  const costPrice = readDecimal(formData, "costPrice");
  const sellingPrice = readDecimal(formData, "sellingPrice");

  await prisma.product.update({
    data: {
      category: selectedCategory,
      color,
      costPrice,
      fabricType,
      name,
      sellingPrice,
      size,
      sku,
      type,
      unit
    },
    where: {
      id: productId
    }
  });

  revalidatePath("/inventory");
  redirect(inventoryCategoryPath(selectedCategory));
}

export async function deleteInventoryItem(formData: FormData) {
  const productId = readString(formData, "productId");

  if (!productId) {
    return;
  }

  const [movementCount, saleItemCount, tailorRateCount] = await Promise.all([
    prisma.inventoryMovement.count({
      where: {
        productId
      }
    }),
    prisma.saleItem.count({
      where: {
        productId
      }
    }),
    prisma.tailorRate.count({
      where: {
        productId
      }
    })
  ]);

  if (movementCount || saleItemCount || tailorRateCount) {
    await prisma.product.update({
      data: {
        archivedAt: new Date()
      },
      where: {
        id: productId
      }
    });
  } else {
    await prisma.product.delete({
      where: {
        id: productId
      }
    });
  }

  revalidatePath("/inventory");
}

export async function restoreInventoryItem(formData: FormData) {
  const productId = readString(formData, "productId");

  if (!productId) {
    return;
  }

  await prisma.product.update({
    data: {
      archivedAt: null
    },
    where: {
      id: productId
    }
  });

  revalidatePath("/inventory");
}
