"use server";

import { ExpenseCategory, Prisma } from "@prisma/client";
import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const categoryValues = Object.values(ExpenseCategory);

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readDecimal(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? new Prisma.Decimal(value.replace(/,/g, "")) : new Prisma.Decimal(0);
}

function expensesPath(status: string): Route {
  return `/expenses?status=${status}` as Route;
}

function readCategory(formData: FormData) {
  const category = readString(formData, "category") as ExpenseCategory;
  return categoryValues.includes(category) ? category : null;
}

function readSpentAt(formData: FormData) {
  const value = readString(formData, "spentAt");
  return value ? new Date(value) : new Date();
}

function revalidateExpenses() {
  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/report");
}

export async function createExpense(formData: FormData) {
  const category = readCategory(formData);
  const description = readString(formData, "description");
  const note = readString(formData, "note") || null;
  const spentAt = readSpentAt(formData);

  let amount: Prisma.Decimal;

  try {
    amount = readDecimal(formData, "amount");
  } catch {
    redirect(expensesPath("invalid-number"));
  }

  if (!category || !description || amount.lte(0) || Number.isNaN(spentAt.getTime())) {
    redirect(expensesPath("missing"));
  }

  await prisma.expense.create({
    data: {
      amount,
      category,
      description,
      note,
      spentAt
    }
  });

  revalidateExpenses();
  redirect(expensesPath("created"));
}

export async function updateExpense(formData: FormData) {
  const expenseId = readString(formData, "expenseId");
  const category = readCategory(formData);
  const description = readString(formData, "description");
  const note = readString(formData, "note") || null;
  const spentAt = readSpentAt(formData);

  let amount: Prisma.Decimal;

  try {
    amount = readDecimal(formData, "amount");
  } catch {
    redirect(expensesPath("invalid-number"));
  }

  if (!expenseId || !category || !description || amount.lte(0) || Number.isNaN(spentAt.getTime())) {
    redirect(expensesPath("missing"));
  }

  await prisma.expense.update({
    data: {
      amount,
      category,
      description,
      note,
      spentAt
    },
    where: {
      id: expenseId
    }
  });

  revalidateExpenses();
  redirect(expensesPath("updated"));
}

export async function deleteExpense(formData: FormData) {
  const expenseId = readString(formData, "expenseId");

  if (!expenseId) {
    redirect(expensesPath("missing"));
  }

  await prisma.expense.delete({
    where: {
      id: expenseId
    }
  });

  revalidateExpenses();
  redirect(expensesPath("deleted"));
}
