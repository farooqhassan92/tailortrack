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
  return value ? new Prisma.Decimal(value) : null;
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
  const customerId = readString(formData, "customerId");
  const returnTo = safeReturnTo(readString(formData, "returnTo"));

  if (!customerId) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=missing` as Route);
  }

  await prisma.customerMeasurement.create({
    data: {
      ...measurementData(formData),
      customerId
    }
  });

  revalidatePath("/measurements");
  revalidatePath("/customers");
  revalidatePath("/stitching-orders");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=created` as Route);
}

export async function updateMeasurement(formData: FormData) {
  const measurementId = readString(formData, "measurementId");
  const returnTo = safeReturnTo(readString(formData, "returnTo"));

  if (!measurementId) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=missing` as Route);
  }

  await prisma.customerMeasurement.update({
    data: measurementData(formData),
    where: {
      id: measurementId
    }
  });

  revalidatePath("/measurements");
  revalidatePath("/customers");
  revalidatePath("/stitching-orders");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}status=updated` as Route);
}
