"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function settingsPath(status: string): Route {
  return `/settings?status=${status}` as Route;
}

export async function updateBusinessProfile(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const name = readString(formData, "name");
  const phone = readString(formData, "phone") || null;
  const city = readString(formData, "city") || null;
  const address = readString(formData, "address") || null;
  const invoiceFooter = readString(formData, "invoiceFooter") || null;

  if (!name) {
    redirect(settingsPath("missing-name"));
  }

  await prisma.organization.update({
    data: {
      address,
      city,
      invoiceFooter,
      name,
      phone,
      profileCompletedAt: new Date()
    },
    where: {
      id: organizationId
    }
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/report");
  revalidatePath("/sales");
  revalidatePath("/invoices");
  redirect(settingsPath("updated"));
}
