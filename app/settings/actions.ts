"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseBusinessProfileForm } from "@/lib/business-profile-validation";
import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

function settingsPath(status: string): Route {
  return `/settings?status=${status}` as Route;
}

export async function updateBusinessProfile(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const profileInput = parseBusinessProfileForm(formData);

  if (!profileInput.success) {
    redirect(settingsPath(profileInput.status));
  }

  await prisma.organization.update({
    data: {
      address: profileInput.data.address,
      city: profileInput.data.city,
      invoiceFooter: profileInput.data.invoiceFooter,
      name: profileInput.data.name,
      phone: profileInput.data.phone,
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
