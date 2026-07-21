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

function readDecimal(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? new Prisma.Decimal(value.replace(/,/g, "")) : null;
}

function safeReturnTo(value: string) {
  return value.startsWith("/measurements") ? (value as Route) : ("/measurements" as Route);
}

function measurementData(formData: FormData) {
  return {
    chest: readDecimal(formData, "chest"),
    collar: readDecimal(formData, "collar"),
    inseam: readDecimal(formData, "inseam"),
    label: readString(formData, "label") || "Default",
    shirtLength: readDecimal(formData, "shirtLength"),
    shoulder: readDecimal(formData, "shoulder"),
    sleeve: readDecimal(formData, "sleeve"),
    styleNotes: readString(formData, "styleNotes") || null,
    trouserLength: readDecimal(formData, "trouserLength"),
    trouserWaist: readDecimal(formData, "trouserWaist"),
    waist: readDecimal(formData, "waist")
  };
}

export async function createMeasurement(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const customerId = readString(formData, "customerId");
  const returnTo = safeReturnTo(readString(formData, "returnTo"));

  if (!customerId) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=missing` as Route);
  }

  const customerCount = await prisma.customer.count({
    where: {
      archivedAt: null,
      id: customerId,
      organizationId
    }
  });

  if (!customerCount) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=missing` as Route);
  }

  let data: ReturnType<typeof measurementData>;

  try {
    data = measurementData(formData);
  } catch {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=invalid-number` as Route);
  }

  await prisma.customerMeasurement.create({
    data: {
      ...data,
      customerId,
      organizationId
    }
  });

  revalidatePath("/measurements");
  revalidatePath("/customers");
  revalidatePath("/stitching-orders");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=created` as Route);
}

export async function updateMeasurement(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const measurementId = readString(formData, "measurementId");
  const returnTo = safeReturnTo(readString(formData, "returnTo"));

  if (!measurementId) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=missing` as Route);
  }

  let data: ReturnType<typeof measurementData>;

  try {
    data = measurementData(formData);
  } catch {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=invalid-number` as Route);
  }

  await prisma.customerMeasurement.updateMany({
    data,
    where: {
      id: measurementId,
      organizationId
    }
  });

  revalidatePath("/measurements");
  revalidatePath("/customers");
  revalidatePath("/stitching-orders");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=updated` as Route);
}
