import Link from "next/link";
import type { Route } from "next";
import {
  BadgeCheck,
  Banknote,
  Ban,
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  Eye,
  Pencil,
  Plus,
  Scissors,
  X
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

import { createSalaryBatch, saveStitchingRate, updateSalaryBatch, voidSalaryBatch } from "./actions";

export const dynamic = "force-dynamic";

type DecimalLike = {
  toNumber: () => number;
};

type SalaryTab = "pending" | "paid";

const statusMessages = {
  "batch-missing": {
    text: "Salary batch was not found.",
    variant: "warning"
  },
  "batch-updated": {
    text: "Salary batch updated.",
    variant: "success"
  },
  "batch-voided": {
    text: "Salary batch canceled. Its orders are available in pending payments again.",
    variant: "info"
  },
  created: {
    text: "Salary batch created.",
    variant: "success"
  },
  empty: {
    text: "No eligible ready or delivered orders were found for that payment.",
    variant: "warning"
  },
  "invalid-number": {
    text: "Enter valid salary rate numbers before saving.",
    variant: "warning"
  },
  missing: {
    text: "Select at least one ready or delivered stitching order before creating a payment.",
    variant: "warning"
  },
  "missing-rate": {
    text: "Set a stitching rate before creating salary for the selected orders.",
    variant: "warning"
  },
  "rate-missing": {
    text: "Garment type and tailor rate are required.",
    variant: "warning"
  },
  "rate-saved": {
    text: "Stitching rate saved.",
    variant: "success"
  },
  "void-reason-missing": {
    text: "Add a reason before canceling a salary batch.",
    variant: "warning"
  }
} as const;

function asNumber(value: DecimalLike | number | null | undefined) {
  if (!value) {
    return 0;
  }

  return typeof value === "number" ? value : value.toNumber();
}

function formatCurrency(value: DecimalLike | number | null | undefined) {
  return `Rs. ${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0
  }).format(asNumber(value))}`;
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium"
  }).format(value);
}

function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function normalizeRateKey(value: string) {
  return value.trim().toLowerCase();
}

function getSelectedTab(value: string | string[] | undefined): SalaryTab {
  const selectedValue = Array.isArray(value) ? value[0] : value;
  return selectedValue === "paid" ? "paid" : "pending";
}

function startOfWeek(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  const day = nextDate.getDay();
  nextDate.setDate(nextDate.getDate() + (day === 0 ? -6 : 1 - day));
  return nextDate;
}

function endOfWeek(date: Date) {
  const nextDate = startOfWeek(date);
  nextDate.setDate(nextDate.getDate() + 6);
  return nextDate;
}

export default async function SalariesPage({
  searchParams
}: {
  searchParams?: Promise<{
    batchId?: string | string[];
    status?: string | string[];
    tab?: string | string[];
    tailorId?: string | string[];
  }>;
}) {
  const organizationId = await getCurrentOrganizationId();
  const params = await searchParams;
  const selectedTab = getSelectedTab(params?.tab);
  const selectedTailorId = Array.isArray(params?.tailorId) ? params?.tailorId[0] : params?.tailorId;
  const selectedBatchId = Array.isArray(params?.batchId) ? params?.batchId[0] : params?.batchId;
  const status = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const statusMessage = getStatusMessage(statusMessages, status);
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  const [unpaidOrders, batches, batchTotals, stitchingRates] = await Promise.all([
    prisma.stitchingOrder.findMany({
      include: {
        customer: true,
        salaryLines: true,
        tailor: true
      },
      orderBy: [
        {
          completedAt: "desc"
        },
        {
          updatedAt: "desc"
        }
      ],
      where: {
        salaryLines: {
          none: {
            batch: {
              voidedAt: null
            }
          }
        },
        organizationId,
        status: {
          in: ["READY", "DELIVERED"]
        },
        tailorId: {
          not: null
        }
      }
    }),
    prisma.tailorSalaryBatch.findMany({
      include: {
        lines: {
          include: {
            stitchingOrder: {
              include: {
                customer: true
              }
            },
            tailor: true
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 30,
      where: {
        organizationId
      }
    }),
    prisma.tailorSalaryBatch.aggregate({
      _sum: {
        totalAmount: true
      },
      _count: true,
      where: {
        organizationId,
        voidedAt: null
      }
    }),
    prisma.product.findMany({
      orderBy: {
        name: "asc"
      },
      where: {
        archivedAt: null,
        organizationId,
        type: "STITCHING_SERVICE"
      }
    })
  ]);

  const rateByGarmentType = new Map(
    stitchingRates.map((rate) => [normalizeRateKey(rate.name), rate])
  );
  const getOrderRate = (order: (typeof unpaidOrders)[number]) =>
    rateByGarmentType.get(normalizeRateKey(order.garmentType))?.costPrice ?? null;

  const pendingGroups = unpaidOrders.reduce<
    Array<{
      hasMissingRate: boolean;
      orders: typeof unpaidOrders;
      tailor: NonNullable<(typeof unpaidOrders)[number]["tailor"]>;
      total: number;
    }>
  >((groups, order) => {
    if (!order.tailor) {
      return groups;
    }

    const rate = getOrderRate(order);
    const group = groups.find((item) => item.tailor.id === order.tailor?.id);

    if (group) {
      group.orders.push(order);
      group.total += asNumber(rate);
      group.hasMissingRate = group.hasMissingRate || !rate;
    } else {
      groups.push({
        hasMissingRate: !rate,
        orders: [order],
        tailor: order.tailor,
        total: asNumber(rate)
      });
    }

    return groups;
  }, []);

  const paidGroups = batches.flatMap((batch) => {
    const byTailor = new Map<string, { amount: number; lines: typeof batch.lines; tailorName: string }>();

    batch.lines.forEach((line) => {
      const current = byTailor.get(line.tailorId);

      if (current) {
        current.lines.push(line);
        current.amount += asNumber(line.amount);
      } else {
        byTailor.set(line.tailorId, {
          amount: asNumber(line.amount),
          lines: [line],
          tailorName: line.tailor.name
        });
      }
    });

    return Array.from(byTailor.entries()).map(([tailorId, group]) => ({
      ...group,
      batch,
      isVoided: Boolean(batch.voidedAt),
      tailorId
    }));
  });

  const pendingTotal = pendingGroups.reduce((sum, group) => sum + group.total, 0);
  const activePaidGroups = paidGroups.filter((group) => !group.isVoided);

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-indigo-950 shadow-2xl shadow-indigo-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.42),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(14,165,233,0.24),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(16,185,129,0.14),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-indigo-950 shadow-xl shadow-black/20">
                    <ChartNoAxesCombined aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">
                      Weekly payouts
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      Salaries
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">
                  Define stitching rates, review pending tailor payments, and keep paid salary
                  history.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
                {[
                  { icon: Clock3, label: "Pending tailors", value: pendingGroups.length },
                  { icon: Banknote, label: "Pending total", value: formatCurrency(pendingTotal) },
                  { icon: BadgeCheck, label: "Paid entries", value: activePaidGroups.length },
                  { icon: CalendarDays, label: "Paid total", value: formatCurrency(batchTotals._sum.totalAmount) }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white shadow-sm backdrop-blur"
                      key={stat.label}
                    >
                      <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-indigo-300/15 text-indigo-100">
                        <Icon aria-hidden="true" className="size-4" />
                      </div>
                      <p className="text-xs font-medium text-indigo-100">{stat.label}</p>
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

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-950">Stitching rates</h2>
              <p className="mt-1 text-sm text-slate-500">
                Salary is calculated from these garment-type rates.
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {stitchingRates.length ? (
                stitchingRates.map((rate) => (
                  <div
                    className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
                    key={rate.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{rate.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Tailor rate {formatCurrency(rate.costPrice)} - Customer charge{" "}
                        {formatCurrency(rate.sellingPrice)}
                      </p>
                    </div>
                    <details className="group">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                        <Pencil aria-hidden="true" className="size-3.5" />
                        Edit rate
                      </summary>
                      <form
                        action={saveStitchingRate}
                        className="mt-3 grid min-w-[min(28rem,calc(100vw-3rem))] gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                      >
                        <input name="productId" type="hidden" value={rate.id} />
                        <input
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                          defaultValue={rate.name}
                          name="garmentType"
                          placeholder="Shalwar qameez"
                          required
                        />
                        <input
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                          defaultValue={asNumber(rate.costPrice)}
                          min="0.01"
                          name="tailorRate"
                          placeholder="Tailor rate"
                          required
                          step="0.01"
                          type="number"
                        />
                        <input
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                          defaultValue={asNumber(rate.sellingPrice)}
                          min="0"
                          name="customerCharge"
                          placeholder="Customer charge"
                          step="0.01"
                          type="number"
                        />
                        <PendingSubmitButton
                          className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          pendingText="Saving..."
                        >
                          Save rate
                        </PendingSubmitButton>
                      </form>
                    </details>
                  </div>
                ))
              ) : (
                <div className="p-5 text-sm text-slate-500">
                  No rates yet. Add shalwar qameez, waistcoat, suiting, or alteration rates first.
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-3xl border border-indigo-100 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <Plus aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-950">Add stitching rate</h2>
                <p className="text-xs text-slate-500">One rate per garment type</p>
              </div>
            </div>
            <form action={saveStitchingRate} className="mt-5 grid gap-3">
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-indigo-400"
                name="garmentType"
                placeholder="Shalwar qameez, waistcoat, suiting"
                required
              />
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-indigo-400"
                min="0.01"
                name="tailorRate"
                placeholder="Tailor payout rate"
                required
                step="0.01"
                type="number"
              />
              <input
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-indigo-400"
                min="0"
                name="customerCharge"
                placeholder="Customer charge optional"
                step="0.01"
                type="number"
              />
              <PendingSubmitButton
                className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                pendingText="Saving..."
              >
                Save rate
              </PendingSubmitButton>
            </form>
          </aside>
        </section>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/80 bg-white/80 p-2 shadow-sm backdrop-blur">
          {[
            { label: "Pending payments", value: "pending" },
            { label: "Paid history", value: "paid" }
          ].map((tab) => (
            <Link
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                selectedTab === tab.value
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                  : "text-slate-600 hover:bg-white hover:text-slate-950"
              }`}
              href={`/salaries?tab=${tab.value}` as Route}
              key={tab.value}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {selectedTab === "pending" ? (
          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-950">Pending weekly payments</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tailors with ready or delivered work that has not been paid yet.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {pendingGroups.length ? (
                pendingGroups.map((group) => {
                  const isOpen = selectedTailorId === group.tailor.id;

                  return (
                    <article className="bg-white p-5" key={group.tailor.id}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                            <Scissors aria-hidden="true" className="size-5" />
                          </span>
                          <div>
                            <h3 className="text-base font-semibold text-slate-950">
                              {group.tailor.name}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {group.orders.length} unpaid completed order
                              {group.orders.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {group.hasMissingRate ? (
                            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                              Missing rate
                            </span>
                          ) : null}
                          <span className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-950">
                            {formatCurrency(group.total)}
                          </span>
                          <Link
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                            href={`/salaries?tab=pending&tailorId=${group.tailor.id}` as Route}
                          >
                            <Eye aria-hidden="true" className="size-3.5" />
                            {isOpen ? "Viewing" : "Open"}
                          </Link>
                        </div>
                      </div>

                      {isOpen ? (
                        <form action={createSalaryBatch} className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
                            <table className="min-w-full divide-y divide-slate-100 text-sm">
                              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                                <tr>
                                  <th className="px-4 py-3 font-semibold">Pay</th>
                                  <th className="px-4 py-3 font-semibold">Order</th>
                                  <th className="px-4 py-3 font-semibold">Customer</th>
                                  <th className="px-4 py-3 font-semibold">Completed</th>
                                  <th className="px-4 py-3 text-right font-semibold">Rate</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.orders.map((order) => {
                                  const rate = getOrderRate(order);
                                  const hasRate = Boolean(rate && rate.toNumber() > 0);

                                  return (
                                    <tr key={order.id}>
                                      <td className="px-4 py-3">
                                        <input
                                          className="size-4 rounded border-slate-300 text-indigo-600"
                                          defaultChecked={hasRate}
                                          disabled={!hasRate}
                                          name="orderId"
                                          type="checkbox"
                                          value={order.id}
                                        />
                                      </td>
                                      <td className="px-4 py-3">
                                        <p className="font-semibold text-slate-950">
                                          {order.orderNumber}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                          {order.garmentType}
                                        </p>
                                      </td>
                                      <td className="px-4 py-3 text-slate-600">
                                        {order.customer.name}
                                      </td>
                                      <td className="px-4 py-3 text-slate-600">
                                        {formatDate(order.completedAt ?? order.deliveredAt)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-semibold text-slate-950">
                                        {hasRate ? (
                                          formatCurrency(rate)
                                        ) : (
                                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                            Add rate
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                              Week start
                              <input
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                defaultValue={dateInputValue(weekStart)}
                                name="periodStart"
                                type="date"
                              />
                            </label>
                            <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                              Week end
                              <input
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                defaultValue={dateInputValue(weekEnd)}
                                name="periodEnd"
                                type="date"
                              />
                            </label>
                            <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                              Notes
                              <input
                                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                name="notes"
                                placeholder={`Weekly salary for ${group.tailor.name}`}
                              />
                            </label>
                            <PendingSubmitButton
                              className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white md:col-span-2 disabled:cursor-not-allowed disabled:bg-slate-300"
                              disabled={group.hasMissingRate}
                              pendingText="Marking paid..."
                            >
                              Mark selected as paid
                            </PendingSubmitButton>
                          </div>
                        </form>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="p-10 text-center">
                  <BadgeCheck aria-hidden="true" className="mx-auto size-10 text-emerald-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-950">
                    No pending tailor payments
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Ready or delivered unpaid work appears here after a tailor is assigned.
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-950">Paid salary history</h2>
              <p className="mt-1 text-sm text-slate-500">
                Open a paid entry to see the work included in that payment, then use Close to hide it.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {paidGroups.length ? (
                paidGroups.map((entry) => {
                  const isOpen = selectedBatchId === entry.batch.id && selectedTailorId === entry.tailorId;
                  const articleClassName = entry.isVoided
                    ? "bg-slate-50 p-5"
                    : "bg-white p-5";

                  return (
                    <article className={articleClassName} key={`${entry.batch.id}-${entry.tailorId}`}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-950">
                              {entry.tailorName}
                            </h3>
                            {entry.isVoided ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                                <Ban aria-hidden="true" className="size-3.5" />
                                Canceled
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                Paid
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(entry.batch.periodStart)} - {formatDate(entry.batch.periodEnd)} ·{" "}
                            {entry.lines.length} order{entry.lines.length === 1 ? "" : "s"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                            {formatCurrency(entry.amount)}
                          </span>
                          <Link
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                              isOpen
                                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                : "bg-slate-950 text-white"
                            }`}
                            href={
                              isOpen
                                ? ("/salaries?tab=paid" as Route)
                                : (`/salaries?tab=paid&batchId=${entry.batch.id}&tailorId=${entry.tailorId}` as Route)
                            }
                          >
                            {isOpen ? (
                              <X aria-hidden="true" className="size-3.5" />
                            ) : (
                              <Eye aria-hidden="true" className="size-3.5" />
                            )}
                            {isOpen ? "Close" : "Open"}
                          </Link>
                        </div>
                      </div>

                      {isOpen ? (
                        <div className="mt-4 space-y-4">
                          <div className="overflow-x-auto rounded-2xl border border-slate-100">
                          <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                              <tr>
                                <th className="px-4 py-3 font-semibold">Order</th>
                                <th className="px-4 py-3 font-semibold">Customer</th>
                                <th className="px-4 py-3 font-semibold">Garment</th>
                                <th className="px-4 py-3 text-right font-semibold">
                                  {entry.isVoided ? "Canceled amount" : "Paid"}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {entry.lines.map((line) => (
                                <tr key={line.id}>
                                  <td className="px-4 py-3 font-semibold text-slate-950">
                                    {line.stitchingOrder.orderNumber}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {line.stitchingOrder.customer.name}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">
                                    {line.stitchingOrder.garmentType}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-slate-950">
                                    {formatCurrency(line.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {entry.batch.notes ? (
                            <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                              {entry.batch.notes}
                            </p>
                          ) : null}
                          {entry.batch.voidReason ? (
                            <p className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                              Cancel reason: {entry.batch.voidReason}
                            </p>
                          ) : null}
                          </div>

                          {!entry.isVoided ? (
                            <div className="space-y-3">
                              <details className="group rounded-2xl border border-slate-100 bg-slate-50">
                                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-800">
                                  <Pencil aria-hidden="true" className="size-4" />
                                  Edit period or notes
                                  <span className="ml-auto text-xs text-slate-500 group-open:hidden">
                                    Open
                                  </span>
                                  <span className="ml-auto hidden text-xs text-slate-500 group-open:inline">
                                    Close
                                  </span>
                                </summary>
                                <form
                                  action={updateSalaryBatch}
                                  className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-2"
                                >
                                  <input name="batchId" type="hidden" value={entry.batch.id} />
                                  <input name="tailorId" type="hidden" value={entry.tailorId} />
                                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                                    Period start
                                    <input
                                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                      defaultValue={dateInputValue(entry.batch.periodStart)}
                                      name="periodStart"
                                      type="date"
                                    />
                                  </label>
                                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                                    Period end
                                    <input
                                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                      defaultValue={dateInputValue(entry.batch.periodEnd)}
                                      name="periodEnd"
                                      type="date"
                                    />
                                  </label>
                                  <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                                    Notes
                                    <input
                                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                      defaultValue={entry.batch.notes ?? ""}
                                      name="notes"
                                      placeholder="Payment notes"
                                    />
                                  </label>
                                  <PendingSubmitButton
                                    className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
                                    pendingText="Saving..."
                                  >
                                    Save changes
                                  </PendingSubmitButton>
                                </form>
                              </details>

                              <details className="group rounded-2xl border border-rose-100 bg-rose-50">
                                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-rose-800">
                                  <Ban aria-hidden="true" className="size-4" />
                                  Cancel salary batch
                                  <span className="ml-auto text-xs text-rose-600 group-open:hidden">
                                    Open
                                  </span>
                                  <span className="ml-auto hidden text-xs text-rose-600 group-open:inline">
                                    Close
                                  </span>
                                </summary>
                                <form action={voidSalaryBatch} className="grid gap-3 border-t border-rose-100 p-4">
                                  <input name="batchId" type="hidden" value={entry.batch.id} />
                                  <input name="tailorId" type="hidden" value={entry.tailorId} />
                                  <p className="text-xs leading-5 text-rose-700">
                                    Keeps the history and returns these orders to pending payments.
                                  </p>
                                  <input
                                    className="h-11 rounded-xl border border-rose-200 bg-white px-3 text-sm outline-none focus:border-rose-400"
                                    name="voidReason"
                                    placeholder="Reason for cancellation"
                                    required
                                  />
                                  <PendingSubmitButton
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    pendingText="Canceling..."
                                  >
                                    <Ban aria-hidden="true" className="size-4" />
                                    Confirm cancel batch
                                  </PendingSubmitButton>
                                </form>
                              </details>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="p-10 text-center">
                  <CalendarDays aria-hidden="true" className="mx-auto size-10 text-indigo-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-950">No paid history yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Paid salary batches will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
