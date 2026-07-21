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

function tailorsPath(status: string): Route {
  return `/tailors?status=${status}` as Route;
}

export async function createTailor(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const name = readString(formData, "name");
  const phone = readString(formData, "phone") || null;

  if (!name) {
    redirect(tailorsPath("missing"));
  }

  await prisma.tailor.create({
    data: {
      name,
      organizationId,
      phone
    }
  });

  revalidatePath("/tailors");
  revalidatePath("/stitching-orders");
  redirect(tailorsPath("created"));
}

export async function updateTailor(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const tailorId = readString(formData, "tailorId");
  const name = readString(formData, "name");
  const phone = readString(formData, "phone") || null;

  if (!tailorId || !name) {
    redirect(tailorsPath("missing"));
  }

  await prisma.tailor.updateMany({
    data: {
      name,
      phone
    },
    where: {
      id: tailorId,
      organizationId
    }
  });

  revalidatePath("/tailors");
  revalidatePath("/stitching-orders");
  redirect(tailorsPath("updated"));
}

export async function toggleTailorActive(formData: FormData) {
  const organizationId = await getCurrentOrganizationId();
  const tailorId = readString(formData, "tailorId");
  const active = readString(formData, "active") === "true";

  if (!tailorId) {
    redirect(tailorsPath("missing"));
  }

  await prisma.tailor.updateMany({
    data: {
      active
    },
    where: {
      id: tailorId,
      organizationId
    }
  });

  revalidatePath("/tailors");
  revalidatePath("/stitching-orders");
  redirect(tailorsPath(active ? "activated" : "deactivated"));
}
