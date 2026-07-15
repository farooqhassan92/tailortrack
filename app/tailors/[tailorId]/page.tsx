import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarDays,
  Clock3,
  Phone,
  Scissors,
  UserRound
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DecimalLike = {
  toNumber: () => number;
};

type WorkTab = "active" | "payable" | "paid" | "all";

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

function normalizeRateKey(value: string) {
  return value.trim().toLowerCase();
}

function getSelectedTab(value: string | string[] | undefined): WorkTab {
  const selectedValue = Array.isArray(value) ? value[0] : value;

  if (selectedValue === "payable" || selectedValue === "paid" || selectedValue === "all") {
    return selectedValue;
  }

  return "active";
}

function statusTone(status: string) {
  if (status === "DELIVERED") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (status === "READY") {
    return "border-indigo-100 bg-indigo-50 text-indigo-700";
  }

  if (status === "CANCELLED") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  return "border-amber-100 bg-amber-50 text-amber-700";
}

export default async function TailorDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ tailorId: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const [{ tailorId }, queryParams] = await Promise.all([params, searchParams]);
  const selectedTab = getSelectedTab(queryParams?.tab);

  const [tailor, stitchingRates] = await Promise.all([
    prisma.tailor.findUnique({
      include: {
        salaryLines: {
          include: {
            batch: true,
            stitchingOrder: {
              include: {
                customer: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        stitchingOrders: {
          include: {
            customer: true,
            salaryLines: {
              include: {
                batch: {
                  select: {
                    createdAt: true,
                    id: true,
                    voidedAt: true
                  }
                }
              }
            }
          },
          orderBy: [
            {
              dueDate: "asc"
            },
            {
              createdAt: "desc"
            }
          ]
        }
      },
      where: {
        id: tailorId
      }
    }),
    prisma.product.findMany({
      where: {
        archivedAt: null,
        type: "STITCHING_SERVICE"
      }
    })
  ]);

  if (!tailor) {
    notFound();
  }

  const rateByGarmentType = new Map(
    stitchingRates.map((rate) => [normalizeRateKey(rate.name), rate.costPrice])
  );
  const activeOrders = tailor.stitchingOrders.filter((order) =>
    ["PENDING", "CUTTING", "STITCHING", "READY"].includes(order.status)
  );
  const payableOrders = tailor.stitchingOrders.filter((order) => {
    const isPayableStatus = ["READY", "DELIVERED"].includes(order.status);
    const hasActiveSalaryLine = order.salaryLines.some((line) => line.batch.voidedAt === null);

    return isPayableStatus && !hasActiveSalaryLine;
  });
  const paidLines = tailor.salaryLines.filter((line) => line.batch.voidedAt === null);
  const pendingPayable = payableOrders.reduce((sum, order) => {
    const rate = rateByGarmentType.get(normalizeRateKey(order.garmentType));

    return sum + asNumber(rate);
  }, 0);
  const paidTotal = paidLines.reduce((sum, line) => sum + asNumber(line.amount), 0);
  const visibleOrders =
    selectedTab === "payable"
      ? payableOrders
      : selectedTab === "all"
        ? tailor.stitchingOrders
        : activeOrders;

  const tabs: Array<{ label: string; tab: WorkTab; value: number }> = [
    { label: "Active work", tab: "active", value: activeOrders.length },
    { label: "Payable", tab: "payable", value: payableOrders.length },
    { label: "Paid history", tab: "paid", value: paidLines.length },
    { label: "All work", tab: "all", value: tailor.stitchingOrders.length }
  ];

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.55),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(20,184,166,0.22),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(14,165,233,0.14),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Link
                  className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                  href={"/tailors" as Route}
                >
                  <ArrowLeft aria-hidden="true" className="size-3.5" />
                  Tailors
                </Link>
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl shadow-black/20">
                    <Scissors aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Tailor work ledger
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      {tailor.name}
                    </h1>
                  </div>
                </div>
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300">
                  <Phone aria-hidden="true" className="size-4" />
                  {tailor.phone || "No phone"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[38rem]">
                {[
                  { icon: UserRound, label: "Status", value: tailor.active ? "Active" : "Inactive" },
                  { icon: Clock3, label: "Active", value: activeOrders.length },
                  { icon: Banknote, label: "Payable", value: formatCurrency(pendingPayable) },
                  { icon: BadgeCheck, label: "Paid", value: formatCurrency(paidTotal) }
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

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Work details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review assigned work, payable dues, and salary history.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {tabs.map((item) => (
                  <Link
                    className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                      selectedTab === item.tab
                        ? "bg-slate-950 text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                    href={`/tailors/${tailor.id}?tab=${item.tab}` as Route}
                    key={item.tab}
                  >
                    {item.label} ({item.value})
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {selectedTab === "paid" ? (
            <div className="divide-y divide-slate-100">
              {paidLines.length ? (
                paidLines.map((line) => (
                  <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_1fr_8rem_8rem]" key={line.id}>
                    <div>
                      <Link
                        className="text-sm font-semibold text-slate-950 hover:text-slate-700"
                        href={`/stitching-orders?q=${encodeURIComponent(line.stitchingOrder.orderNumber)}` as Route}
                      >
                        {line.stitchingOrder.orderNumber}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {line.stitchingOrder.customer.name} - {line.stitchingOrder.garmentType}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <p className="font-medium text-slate-950">Salary batch</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(line.batch.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-400">Paid</p>
                      <p className="mt-1 text-sm font-semibold text-slate-950">
                        {formatCurrency(line.amount)}
                      </p>
                    </div>
                    <div>
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Paid
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState text="No paid salary history for this tailor yet." />
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleOrders.length ? (
                visibleOrders.map((order) => {
                  const rate = rateByGarmentType.get(normalizeRateKey(order.garmentType));
                  const hasActiveSalaryLine = order.salaryLines.some(
                    (line) => line.batch.voidedAt === null
                  );

                  return (
                    <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.2fr)_1fr_8rem_8rem]" key={order.id}>
                      <div>
                        <Link
                          className="text-sm font-semibold text-slate-950 hover:text-slate-700"
                          href={`/stitching-orders?q=${encodeURIComponent(order.orderNumber)}` as Route}
                        >
                          {order.orderNumber}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.customer.name} - {order.garmentType}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <CalendarDays aria-hidden="true" className="size-4 text-slate-400" />
                        Due {formatDate(order.dueDate)}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400">Rate</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {rate ? formatCurrency(rate) : "Not set"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(order.status)}`}
                        >
                          {order.status}
                        </span>
                        {hasActiveSalaryLine ? (
                          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Paid
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  text={
                    selectedTab === "payable"
                      ? "No unpaid ready or delivered work for this tailor."
                      : "No work found for this view."
                  }
                />
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-10 text-center">
      <Scissors aria-hidden="true" className="mx-auto size-10 text-slate-500" />
      <p className="mt-3 text-sm font-semibold text-slate-950">{text}</p>
    </div>
  );
}
