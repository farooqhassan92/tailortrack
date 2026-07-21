import Link from "next/link";
import type { Route } from "next";
import { ExpenseCategory, type Prisma } from "@prisma/client";
import {
  Banknote,
  CalendarDays,
  ChartNoAxesCombined,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  WalletCards
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import {
  asNumber,
  formatCurrency,
  formatDate,
  getPeriodStart,
  getSelectedPeriod,
  periodOptions,
  type PeriodValue
} from "@/lib/dashboard-report";
import { prisma } from "@/lib/prisma";

import { createExpense, deleteExpense, updateExpense } from "./actions";

export const dynamic = "force-dynamic";

const categoryOptions = [
  { label: "All", value: "all" },
  { label: "Rent", value: "RENT" },
  { label: "Electricity", value: "ELECTRICITY" },
  { label: "Staff", value: "STAFF" },
  { label: "Transport", value: "TRANSPORT" },
  { label: "Repairs", value: "REPAIRS" },
  { label: "Supplies", value: "SUPPLIES" },
  { label: "Misc", value: "MISC" }
] as const;

type CategoryFilter = "all" | ExpenseCategory;

const statusMessages = {
  created: {
    text: "Expense recorded.",
    variant: "success"
  },
  deleted: {
    text: "Expense deleted.",
    variant: "info"
  },
  "invalid-number": {
    text: "Enter a valid expense amount.",
    variant: "warning"
  },
  missing: {
    text: "Select a category, add a description, and enter an amount.",
    variant: "warning"
  },
  updated: {
    text: "Expense updated.",
    variant: "success"
  }
} as const;

function getCategory(value: string | string[] | undefined): CategoryFilter {
  const selectedValue = Array.isArray(value) ? value[0] : value;

  if (Object.values(ExpenseCategory).includes(selectedValue as ExpenseCategory)) {
    return selectedValue as ExpenseCategory;
  }

  return "all";
}

function categoryLabel(value: ExpenseCategory | CategoryFilter) {
  return categoryOptions.find((option) => option.value === value)?.label ?? "Expense";
}

function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function expensesHref({
  category,
  period,
  q
}: {
  category: CategoryFilter;
  period: PeriodValue;
  q?: string;
}) {
  return `/expenses?${new URLSearchParams({
    ...(category !== "all" ? { category } : {}),
    period,
    ...(q ? { q } : {})
  }).toString()}` as Route;
}

export default async function ExpensesPage({
  searchParams
}: {
  searchParams?: Promise<{
    category?: string | string[];
    period?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const selectedCategory = getCategory(params?.category);
  const selectedPeriod = getSelectedPeriod(params?.period);
  const queryValue = Array.isArray(params?.q) ? params.q[0] : params?.q;
  const status = Array.isArray(params?.status) ? params.status[0] : params?.status;
  const query = queryValue?.trim() ?? "";
  const statusMessage = getStatusMessage(statusMessages, status);
  const now = new Date();
  const startDate = getPeriodStart(selectedPeriod, now);
  const periodWhere = {
    spentAt: {
      gte: startDate,
      lte: now
    }
  };
  const categoryWhere: Prisma.ExpenseWhereInput =
    selectedCategory === "all" ? {} : { category: selectedCategory };
  const queryWhere: Prisma.ExpenseWhereInput = query
    ? {
        OR: [
          { description: { contains: query, mode: "insensitive" as const } },
          { note: { contains: query, mode: "insensitive" as const } }
        ]
      }
    : {};
  const where: Prisma.ExpenseWhereInput = {
    ...periodWhere,
    ...categoryWhere,
    ...queryWhere
  };

  const [expenses, periodTotals, allTimeTotals, expenseCount] = await Promise.all([
    prisma.expense.findMany({
      orderBy: {
        spentAt: "desc"
      },
      take: 80,
      where
    }),
    prisma.expense.groupBy({
      _sum: {
        amount: true
      },
      by: ["category"],
      where
    }),
    prisma.expense.aggregate({
      _sum: {
        amount: true
      }
    }),
    prisma.expense.count({
      where
    })
  ]);

  const periodTotal = periodTotals.reduce((sum, item) => sum + asNumber(item._sum.amount), 0);
  const highestCategory = [...periodTotals].sort(
    (a, b) => asNumber(b._sum.amount) - asNumber(a._sum.amount)
  )[0];

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.34),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(245,158,11,0.22),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(14,165,233,0.14),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl shadow-black/20">
                    <WalletCards aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">
                      Cost control
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      Expenses
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Track shop costs and feed real profit reporting across the dashboard.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[38rem]">
                {[
                  { icon: Banknote, label: "Period total", value: formatCurrency(periodTotal) },
                  { icon: ReceiptText, label: "Entries", value: expenseCount },
                  {
                    icon: ChartNoAxesCombined,
                    label: "Top category",
                    value: highestCategory ? categoryLabel(highestCategory.category) : "None"
                  },
                  { icon: CalendarDays, label: "All time", value: formatCurrency(allTimeTotals._sum.amount) }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white shadow-sm backdrop-blur"
                      key={stat.label}
                    >
                      <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-white/10 text-slate-100">
                        <Icon aria-hidden="true" className="size-4" />
                      </div>
                      <p className="text-xs font-medium text-slate-300">{stat.label}</p>
                      <p className="mt-1 truncate text-base font-semibold text-white">
                        {stat.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <StatusAlert message={statusMessage} />

        <section className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <form action="/expenses" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[30rem]">
              <input name="category" type="hidden" value={selectedCategory} />
              <input name="period" type="hidden" value={selectedPeriod} />
              <label className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  defaultValue={query}
                  name="q"
                  placeholder="Search description or note"
                />
              </label>
              <button className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm">
                Search
              </button>
            </form>

            <div className="flex gap-2 overflow-x-auto">
              {periodOptions.map((period) => (
                <Link
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    selectedPeriod === period.value
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                      : "border border-slate-100 bg-white text-slate-600 hover:text-slate-950"
                  }`}
                  href={expensesHref({ category: selectedCategory, period: period.value, q: query })}
                  key={period.value}
                >
                  {period.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Expense list</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Showing {expenses.length} of {expenseCount} matching entries.
                  </p>
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {categoryOptions.map((category) => (
                    <Link
                      className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${
                        selectedCategory === category.value
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                      href={expensesHref({
                        category: category.value as CategoryFilter,
                        period: selectedPeriod,
                        q: query
                      })}
                      key={category.value}
                    >
                      {category.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {expenses.length ? (
                expenses.map((expense) => (
                  <article className="bg-white p-5 transition hover:bg-rose-50/30" key={expense.id}>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_9rem_9rem_6rem]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-950">
                            {expense.description}
                          </h3>
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                            {categoryLabel(expense.category)}
                          </span>
                        </div>
                        {expense.note ? (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                            {expense.note}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400">Date</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {formatDate(expense.spentAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400">Amount</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                      <div className="flex gap-2 lg:justify-end">
                        <details className="group">
                          <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:text-slate-950">
                            <Pencil aria-hidden="true" className="size-4" />
                          </summary>
                          <form
                            action={updateExpense}
                            className="mt-3 grid min-w-[min(28rem,calc(100vw-3rem))] gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <input name="expenseId" type="hidden" value={expense.id} />
                            <ExpenseFields expense={expense} />
                            <button className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">
                              Save expense
                            </button>
                          </form>
                        </details>
                        <form action={deleteExpense}>
                          <input name="expenseId" type="hidden" value={expense.id} />
                          <button
                            className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                            title="Delete expense"
                            type="submit"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                            <span className="sr-only">Delete {expense.description}</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="p-10 text-center">
                  <WalletCards aria-hidden="true" className="mx-auto size-10 text-slate-500" />
                  <p className="mt-3 text-sm font-semibold text-slate-950">No expenses found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Record daily costs to make profit reports accurate.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <details className="group rounded-3xl border border-rose-100/80 bg-gradient-to-br from-white to-rose-50/60 p-5 shadow-sm backdrop-blur" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-rose-700 shadow-sm">
                    <Plus aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-950">
                      Add expense
                    </span>
                    <span className="block text-xs text-slate-500">Rent, salaries, supplies</span>
                  </span>
                </span>
                <span className="text-sm font-semibold text-rose-700 group-open:hidden">Open</span>
                <span className="hidden text-sm font-semibold text-slate-500 group-open:inline">
                  Close
                </span>
              </summary>

              <form action={createExpense} className="mt-5 grid gap-3">
                <ExpenseFields />
                <button className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm">
                  Record expense
                </button>
              </form>
            </details>

            <section className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <ChartNoAxesCombined aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Profit reporting</h2>
                  <p className="text-xs text-slate-500">Used by dashboard reports</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>Expenses reduce net profit in the dashboard and printable report.</p>
                <p>Inventory cost and paid tailor salaries are calculated separately.</p>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function ExpenseFields({
  expense
}: {
  expense?: {
    amount: { toNumber: () => number };
    category: ExpenseCategory;
    description: string;
    note: string | null;
    spentAt: Date;
  };
}) {
  return (
    <>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Category
        <select
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          defaultValue={expense?.category ?? "MISC"}
          name="category"
          required
        >
          {categoryOptions
            .filter((category) => category.value !== "all")
            .map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Description
        <input
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          defaultValue={expense?.description ?? ""}
          name="description"
          placeholder="Electricity bill"
          required
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Amount
          <input
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            defaultValue={expense ? asNumber(expense.amount) : ""}
            min="0.01"
            name="amount"
            placeholder="0"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          Date
          <input
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
            defaultValue={expense ? dateInputValue(expense.spentAt) : dateInputValue(new Date())}
            name="spentAt"
            required
            type="date"
          />
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-slate-700">
        Note
        <textarea
          className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
          defaultValue={expense?.note ?? ""}
          name="note"
          placeholder="Optional detail"
        />
      </label>
    </>
  );
}
