"use server";

import type { StitchingStatus } from "@prisma/client";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const statuses: StitchingStatus[] = [
  "PENDING",
  "CUTTING",
  "STITCHING",
  "READY",
  "DELIVERED",
  "CANCELLED"
];

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readStatus(value: string): StitchingStatus {
  return statuses.includes(value as StitchingStatus) ? (value as StitchingStatus) : "PENDING";
}

function safeReturnTo(value: string) {
  return value.startsWith("/stitching-orders") ? (value as Route) : ("/stitching-orders" as Route);
}

export async function updateStitchingOrder(formData: FormData) {
  const orderId = readString(formData, "orderId");
  const status = readStatus(readString(formData, "status"));
  const tailorId = readString(formData, "tailorId") || null;
  const dueDateValue = readString(formData, "dueDate");
  const styleNotes = readString(formData, "styleNotes") || null;
  const returnTo = safeReturnTo(readString(formData, "returnTo"));

  if (!orderId) {
    redirect(returnTo);
  }

  const now = new Date();

  await prisma.stitchingOrder.update({
    data: {
      completedAt: status === "READY" || status === "DELIVERED" ? now : undefined,
      deliveredAt: status === "DELIVERED" ? now : undefined,
      dueDate: dueDateValue ? new Date(dueDateValue) : null,
      status,
      styleNotes,
      tailorId
    },
    where: {
      id: orderId
    }
  });

  revalidatePath("/stitching-orders");
  revalidatePath("/dashboard");
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}updated=1` as Route);
}
