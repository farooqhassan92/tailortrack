"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function customersPath(status: string): Route {
  return `/customers?status=${status}` as Route;
}

export async function createCustomer(formData: FormData) {
  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  const address = readString(formData, "address") || null;
  const notes = readString(formData, "notes") || null;

  if (!name || !phone) {
    redirect(customersPath("missing"));
  }

  await prisma.customer.create({
    data: {
      address,
      name,
      notes,
      phone
    }
  });

  revalidatePath("/customers");
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

  revalidatePath("/customers");
  revalidatePath("/sales");
  redirect(customersPath("updated"));
}

export async function archiveOrDeleteCustomer(formData: FormData) {
  const customerId = readString(formData, "customerId");

  if (!customerId) {
    return;
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
