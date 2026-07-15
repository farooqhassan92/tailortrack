"use server";

import type { Route } from "next";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
        ...(hasMeasurementData(measurement)
          ? {
              measurements: {
                create: measurement
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
  const customerId = readString(formData, "customerId");
  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  const address = readString(formData, "address") || null;
  const notes = readString(formData, "notes") || null;

  if (!customerId || !name || !phone) {
    redirect(customersPath("missing"));
  }

  try {
    await prisma.customer.update({
      data: {
        address,
        name,
        notes,
        phone
      },
      where: {
        id: customerId
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
  const customerId = readString(formData, "customerId");

  if (!customerId) {
    redirect(customersPath("missing"));
  }

  const [saleCount, stitchingOrderCount, measurementCount] = await Promise.all([
    prisma.sale.count({
      where: {
        customerId
      }
    }),
    prisma.stitchingOrder.count({
      where: {
        customerId
      }
    }),
    prisma.customerMeasurement.count({
      where: {
        customerId
      }
    })
  ]);

  if (saleCount || stitchingOrderCount || measurementCount) {
    await prisma.customer.update({
      data: {
        archivedAt: new Date()
      },
      where: {
        id: customerId
      }
    });
  } else {
    await prisma.customer.delete({
      where: {
        id: customerId
      }
    });
  }

  revalidatePath("/customers");
  revalidatePath("/sales");
  redirect(customersPath("archived"));
}
