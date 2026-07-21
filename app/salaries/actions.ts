"use server";

import { Prisma } from "@prisma/client";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function salariesPath(status: string): Route {
  return `/salaries?status=${status}` as Route;
}

function paidSalariesPath(status: string, batchId?: string, tailorId?: string): Route {
  const params = new URLSearchParams({
    status,
    tab: "paid"
  });

  if (batchId) {
    params.set("batchId", batchId);
  }

  if (tailorId) {
    params.set("tailorId", tailorId);
  }

  return `/salaries?${params.toString()}` as Route;
}

function readDecimal(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? new Prisma.Decimal(value.replace(/,/g, "")) : new Prisma.Decimal(0);
}

function parseDate(value: string, fallback: Date) {
  return value ? new Date(value) : fallback;
}

function normalizeRateKey(value: string) {
  return value.trim().toLowerCase();
}

export async function saveStitchingRate(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const productId = readString(formData, "productId");
  const garmentType = readString(formData, "garmentType");
  let tailorRate: Prisma.Decimal;
  let customerCharge: Prisma.Decimal;

  try {
    tailorRate = readDecimal(formData, "tailorRate");
    customerCharge = readDecimal(formData, "customerCharge");
  } catch {
    redirect(salariesPath("invalid-number"));
  }

  if (!garmentType || tailorRate.lte(0)) {
    redirect(salariesPath("rate-missing"));
  }

  if (productId) {
    await prisma.product.updateMany({
      data: {
        costPrice: tailorRate,
        name: garmentType,
        sellingPrice: customerCharge
      },
      where: {
        id: productId,
        organizationId
      }
    });
  } else {
    const existingRate = await prisma.product.findFirst({
      where: {
        name: {
          equals: garmentType,
          mode: "insensitive"
        },
        organizationId,
        type: "STITCHING_SERVICE"
      }
    });

    if (existingRate) {
      await prisma.product.update({
        data: {
          costPrice: tailorRate,
          name: garmentType,
          sellingPrice: customerCharge
        },
        where: {
          id: existingRate.id
        }
      });
    } else {
      await prisma.product.create({
        data: {
          category: "STITCHING_RATES",
          costPrice: tailorRate,
          name: garmentType,
          organizationId,
          quantityOnHand: new Prisma.Decimal(0),
          sellingPrice: customerCharge,
          type: "STITCHING_SERVICE",
          unit: "service"
        }
      });
    }
  }

  revalidatePath("/salaries");
  revalidatePath("/sales");
  redirect(salariesPath("rate-saved"));
}

export async function createSalaryBatch(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const orderIds = formData
    .getAll("orderId")
    .filter((value): value is string => typeof value === "string" && Boolean(value));
  const periodStartValue = readString(formData, "periodStart");
  const periodEndValue = readString(formData, "periodEnd");
  const notes = readString(formData, "notes") || null;

  if (!orderIds.length) {
    redirect(salariesPath("missing"));
  }

  const now = new Date();
  const periodStart = parseDate(periodStartValue, now);
  const periodEnd = parseDate(periodEndValue, now);

  const selectedOrders = await prisma.stitchingOrder.findMany({
      include: {
        salaryLines: true
      },
      where: {
        id: {
          in: orderIds
        },
        organizationId,
        salaryLines: {
          none: {
            batch: {
              voidedAt: null
            }
          }
        },
        status: {
          in: ["READY", "DELIVERED"]
        },
        tailorId: {
          not: null
      }
    }
  });
  const stitchingRates = await prisma.product.findMany({
    where: {
      archivedAt: null,
      organizationId,
      type: "STITCHING_SERVICE"
    }
  });

  if (!selectedOrders.length) {
    redirect(salariesPath("empty"));
  }

  const rateByGarmentType = new Map(
    stitchingRates.map((rate) => [normalizeRateKey(rate.name), rate.costPrice])
  );
  const payableOrders = selectedOrders
    .map((order) => {
      const catalogRate = rateByGarmentType.get(normalizeRateKey(order.garmentType));

      return {
        amount: catalogRate,
        order
      };
    })
    .filter((item): item is { amount: Prisma.Decimal; order: (typeof selectedOrders)[number] } =>
      Boolean(item.amount && item.amount.gt(0))
    );

  if (!payableOrders.length) {
    redirect(salariesPath("missing-rate"));
  }

  const totalAmount = payableOrders.reduce(
    (sum, item) => sum.add(item.amount),
    new Prisma.Decimal(0)
  );

  await prisma.tailorSalaryBatch.create({
    data: {
      notes,
      organizationId,
      periodEnd,
      periodStart,
      totalAmount,
      lines: {
        create: payableOrders.map(({ amount, order }) => ({
          amount,
          stitchingOrderId: order.id,
          tailorId: order.tailorId as string
        }))
      }
    }
  });

  revalidatePath("/salaries");
  revalidatePath("/tailors");
  revalidatePath("/stitching-orders");
  redirect(salariesPath("created"));
}

export async function updateSalaryBatch(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const batchId = readString(formData, "batchId");
  const tailorId = readString(formData, "tailorId");
  const periodStartValue = readString(formData, "periodStart");
  const periodEndValue = readString(formData, "periodEnd");
  const notes = readString(formData, "notes") || null;

  if (!batchId) {
    redirect(paidSalariesPath("batch-missing"));
  }

  const existingBatch = await prisma.tailorSalaryBatch.findFirst({
    select: {
      voidedAt: true
    },
    where: {
      id: batchId,
      organizationId
    }
  });

  if (!existingBatch) {
    redirect(paidSalariesPath("batch-missing"));
  }

  if (existingBatch.voidedAt) {
    redirect(paidSalariesPath("batch-voided", batchId, tailorId));
  }

  const now = new Date();

  await prisma.tailorSalaryBatch.updateMany({
    data: {
      notes,
      periodEnd: parseDate(periodEndValue, now),
      periodStart: parseDate(periodStartValue, now)
    },
    where: {
      id: batchId,
      organizationId
    }
  });

  revalidatePath("/salaries");
  redirect(paidSalariesPath("batch-updated", batchId, tailorId));
}

export async function voidSalaryBatch(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const batchId = readString(formData, "batchId");
  const tailorId = readString(formData, "tailorId");
  const voidReason = readString(formData, "voidReason");

  if (!batchId) {
    redirect(paidSalariesPath("batch-missing"));
  }

  if (!voidReason) {
    redirect(paidSalariesPath("void-reason-missing", batchId, tailorId));
  }

  const existingBatch = await prisma.tailorSalaryBatch.findFirst({
    select: {
      voidedAt: true
    },
    where: {
      id: batchId,
      organizationId
    }
  });

  if (!existingBatch) {
    redirect(paidSalariesPath("batch-missing"));
  }

  if (existingBatch.voidedAt) {
    redirect(paidSalariesPath("batch-voided", batchId, tailorId));
  }

  await prisma.tailorSalaryBatch.updateMany({
    data: {
      voidReason,
      voidedAt: new Date()
    },
    where: {
      id: batchId,
      organizationId
    }
  });

  revalidatePath("/salaries");
  revalidatePath("/tailors");
  revalidatePath("/stitching-orders");
  redirect(paidSalariesPath("batch-voided", batchId, tailorId));
}
