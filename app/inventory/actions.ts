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

function inventoryCategoryPath(
  category: keyof typeof categoryDefaults,
  status?: string
): Route {
  const params = new URLSearchParams({
    category
  });

  if (status) {
    params.set("status", status);
  }

  return `/inventory?${params.toString()}` as Route;
}

function inventoryStatusPath(status: string): Route {
  return `/inventory?status=${status}` as Route;
}

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readDecimal(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? new Prisma.Decimal(value.replace(/,/g, "")) : new Prisma.Decimal(0);
}

function makeInternalCode(type: keyof typeof productTypePrefixes) {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${productTypePrefixes[type]}-${stamp}-${suffix}`;
}

function isDuplicateSkuError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes("sku")
  );
}

export async function createInventoryItem(formData: FormData) {
  const category = readString(formData, "category") as keyof typeof categoryDefaults;
  const selectedCategory = categoryDefaults[category] ? category : "UNSTITCHED_ROLLS";
  const categoryConfig = categoryDefaults[selectedCategory];
  const type = categoryConfig.type as keyof typeof productTypePrefixes;
  const name = readString(formData, "name");
  const providedSku = readString(formData, "sku");

  if (!name || !productTypePrefixes[type]) {
    redirect(inventoryCategoryPath(selectedCategory, "missing"));
  }

  const sku = providedSku || makeInternalCode(type);
  const unit = readString(formData, "unit") || categoryConfig.unit;
  const color = readString(formData, "color") || null;
  const size = readString(formData, "size") || null;
  const fabricType = readString(formData, "fabricType") || null;

  let quantity: Prisma.Decimal;
  let costPrice: Prisma.Decimal;
  let sellingPrice: Prisma.Decimal;

  try {
    quantity = readDecimal(formData, "quantity");
    costPrice = readDecimal(formData, "costPrice");
    sellingPrice = readDecimal(formData, "sellingPrice");
  } catch {
    redirect(inventoryCategoryPath(selectedCategory, "invalid-number"));
  }

  if (providedSku) {
    const existingProduct = await prisma.product.findUnique({
      where: {
        sku: providedSku
      }
    });

    if (existingProduct) {
      if (existingProduct.archivedAt) {
        redirect(inventoryCategoryPath(selectedCategory, "archived-code"));
      }

      await prisma.$transaction([
        prisma.product.update({
          data: {
            category: selectedCategory,
            color: color ?? existingProduct.color,
            costPrice: costPrice.gt(0) ? costPrice : existingProduct.costPrice,
            fabricType: fabricType ?? existingProduct.fabricType,
            name,
            quantityOnHand: {
              increment: quantity
            },
            sellingPrice: sellingPrice.gt(0) ? sellingPrice : existingProduct.sellingPrice,
            size: size ?? existingProduct.size,
            type,
            unit
          },
          where: {
            id: existingProduct.id
          }
        }),
        prisma.inventoryMovement.create({
          data: {
            note: "Restocked from add stock item",
            productId: existingProduct.id,
            quantity,
            type: "STOCK_IN"
          }
        })
      ]);

      revalidatePath("/inventory");
      redirect(inventoryCategoryPath(selectedCategory, "restocked"));
    }
  }

  try {
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
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      redirect(inventoryCategoryPath(selectedCategory, "duplicate-code"));
    }

    throw error;
  }

  revalidatePath("/inventory");
  redirect(inventoryCategoryPath(selectedCategory, "created"));
}

export async function recordInventoryMovement(formData: FormData) {
  const productId = readString(formData, "productId");
  const type = readString(formData, "type") as keyof typeof movementLabels;
  const note = readString(formData, "note") || null;

  let quantity: Prisma.Decimal;

  try {
    quantity = readDecimal(formData, "quantity");
  } catch {
    redirect(inventoryStatusPath("invalid-number"));
  }

  if (!productId || !movementLabels[type] || quantity.lte(0)) {
    redirect(inventoryStatusPath("movement-missing"));
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
  redirect(inventoryStatusPath("stock-updated"));
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
