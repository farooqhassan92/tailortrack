"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function tailorsPath(status: string): Route {
  return `/tailors?status=${status}` as Route;
}

export async function createTailor(formData: FormData) {
  const name = readString(formData, "name");
  const phone = readString(formData, "phone") || null;

  if (!name) {
    redirect(tailorsPath("missing"));
  }

  await prisma.tailor.create({
    data: {
      name,
      phone
    }
  });

  revalidatePath("/tailors");
  revalidatePath("/stitching-orders");
  redirect(tailorsPath("created"));
}

export async function updateTailor(formData: FormData) {
  const tailorId = readString(formData, "tailorId");
  const name = readString(formData, "name");
  const phone = readString(formData, "phone") || null;

  if (!tailorId || !name) {
    redirect(tailorsPath("missing"));
  }

  await prisma.tailor.update({
    data: {
      name,
      phone
    },
    where: {
      id: tailorId
    }
  });

  revalidatePath("/tailors");
  revalidatePath("/stitching-orders");
  redirect(tailorsPath("updated"));
}

export async function toggleTailorActive(formData: FormData) {
  const tailorId = readString(formData, "tailorId");
  const active = readString(formData, "active") === "true";

  if (!tailorId) {
    return;
  }

  await prisma.tailor.update({
    data: {
      active
    },
    where: {
      id: tailorId
    }
  });

  revalidatePath("/tailors");
  revalidatePath("/stitching-orders");
  redirect(tailorsPath(active ? "activated" : "deactivated"));
}
