"use server";

import type { Route } from "next";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readDecimal(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? new Prisma.Decimal(value.replace(/,/g, "")) : null;
}

function customersPath(status: string): Route {
  return `/customers?status=${status}` as Route;
}

function isDuplicatePhoneError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    error.meta.target.includes("phone")
  );
}

function readInitialMeasurement(formData: FormData) {
  return {
    chest: readDecimal(formData, "chest"),
    collar: readDecimal(formData, "collar"),
    inseam: readDecimal(formData, "inseam"),
    label: readString(formData, "measurementLabel") || "Default",
    shirtLength: readDecimal(formData, "shirtLength"),
    shoulder: readDecimal(formData, "shoulder"),
    sleeve: readDecimal(formData, "sleeve"),
    styleNotes: readString(formData, "measurementStyleNotes") || null,
    trouserLength: readDecimal(formData, "trouserLength"),
    trouserWaist: readDecimal(formData, "trouserWaist"),
    waist: readDecimal(formData, "waist")
  };
}

function hasMeasurementData(measurement: ReturnType<typeof readInitialMeasurement>) {
  return Boolean(
    measurement.chest ||
      measurement.collar ||
      measurement.inseam ||
      measurement.shirtLength ||
      measurement.shoulder ||
      measurement.sleeve ||
      measurement.styleNotes ||
      measurement.trouserLength ||
      measurement.trouserWaist ||
      measurement.waist
  );
}

export async function createCustomer(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  const address = readString(formData, "address") || null;
  const notes = readString(formData, "notes") || null;

  if (!name || !phone) {
    redirect(customersPath("missing"));
  }

  let measurement: ReturnType<typeof readInitialMeasurement>;

  try {
    measurement = readInitialMeasurement(formData);
  } catch {
    redirect(customersPath("invalid-number"));
  }

  try {
    await prisma.customer.create({
      data: {
        address,
        organizationId,
        ...(hasMeasurementData(measurement)
          ? {
              measurements: {
                create: {
                  ...measurement,
                  organizationId
                }
              }
            }
          : {}),
        name,
        notes,
        phone
      }
    });
  } catch (error) {
    if (isDuplicatePhoneError(error)) {
      redirect(customersPath("duplicate-phone"));
    }

    throw error;
  }

  revalidatePath("/customers");
  revalidatePath("/measurements");
  revalidatePath("/sales");
  redirect(customersPath("created"));
}

export async function updateCustomer(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const customerId = readString(formData, "customerId");
  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  const address = readString(formData, "address") || null;
  const notes = readString(formData, "notes") || null;

  if (!customerId || !name || !phone) {
    redirect(customersPath("missing"));
  }

  try {
    await prisma.customer.updateMany({
      data: {
        address,
        name,
        notes,
        phone
      },
      where: {
        id: customerId,
        organizationId
      }
    });
  } catch (error) {
    if (isDuplicatePhoneError(error)) {
      redirect(customersPath("duplicate-phone"));
    }

    throw error;
  }

  revalidatePath("/customers");
  revalidatePath("/sales");
  redirect(customersPath("updated"));
}

export async function archiveOrDeleteCustomer(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const customerId = readString(formData, "customerId");

  if (!customerId) {
    redirect(customersPath("missing"));
  }

  const [saleCount, stitchingOrderCount, measurementCount] = await Promise.all([
    prisma.sale.count({
      where: {
        customerId,
        organizationId
      }
    }),
    prisma.stitchingOrder.count({
      where: {
        customerId,
        organizationId
      }
    }),
    prisma.customerMeasurement.count({
      where: {
        customerId,
        organizationId
      }
    })
  ]);

  if (saleCount || stitchingOrderCount || measurementCount) {
    await prisma.customer.updateMany({
      data: {
        archivedAt: new Date()
      },
      where: {
        id: customerId,
        organizationId
      }
    });
  } else {
    await prisma.customer.deleteMany({
      where: {
        id: customerId,
        organizationId
      }
    });
  }

  revalidatePath("/customers");
  revalidatePath("/sales");
  redirect(customersPath("archived"));
}
