"use server";

import type { StitchingStatus } from "@prisma/client";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

const statuses: StitchingStatus[] = [
  "PENDING",
  "CUTTING",
  "STITCHING",
  "READY",
  "DELIVERED",
  "CANCELLED"
];

const tailorRequiredStatuses: StitchingStatus[] = ["STITCHING", "READY", "DELIVERED"];

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readStatus(value: string): StitchingStatus {
  return statuses.includes(value as StitchingStatus) ? (value as StitchingStatus) : "PENDING";
}

function safeReturnTo(value: string) {
  return value.startsWith("/stitching-orders") || value.startsWith("/production")
    ? (value as Route)
    : ("/stitching-orders" as Route);
}

export async function updateStitchingOrder(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const orderId = readString(formData, "orderId");
  const status = readStatus(readString(formData, "status"));
  const tailorId = readString(formData, "tailorId") || null;
  const dueDateValue = readString(formData, "dueDate");
  const styleNotes = readString(formData, "styleNotes") || null;
  const returnTo = safeReturnTo(readString(formData, "returnTo"));

  if (!orderId) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}statusMessage=missing` as Route);
  }

  if (tailorRequiredStatuses.includes(status) && !tailorId) {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}statusMessage=tailor-required` as Route);
  }

  if (tailorId) {
    const tailorCount = await prisma.tailor.count({
      where: {
        active: true,
        id: tailorId,
        organizationId
      }
    });

    if (!tailorCount) {
      redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}statusMessage=tailor-required` as Route);
    }
  }

  const now = new Date();

  await prisma.stitchingOrder.updateMany({
    data: {
      completedAt: status === "READY" || status === "DELIVERED" ? now : undefined,
      deliveredAt: status === "DELIVERED" ? now : undefined,
      dueDate: dueDateValue ? new Date(dueDateValue) : null,
      status,
      styleNotes,
      tailorId
    },
    where: {
      id: orderId,
      organizationId
    }
  });

  revalidatePath("/stitching-orders");
  revalidatePath("/production");
  revalidatePath("/dashboard");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}statusMessage=updated` as Route);
}
