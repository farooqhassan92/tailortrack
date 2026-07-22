import Link from "next/link";
import type { Route } from "next";
import type { StitchingStatus } from "@prisma/client";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Eye,
  PackageCheck,
  Scissors,
  TimerReset,
  UserRound
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

import { updateStitchingOrder } from "../stitching-orders/actions";

export const dynamic = "force-dynamic";

type DecimalLike = {
  toNumber: () => number;
};

type ProductionPeriod = "month" | "today" | "week" | "year";

const periodOptions: Array<{ label: string; value: ProductionPeriod }> = [
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "This month", value: "month" },
  { label: "This year", value: "year" }
];

const productionStatuses: Array<{ label: string; value: StitchingStatus }> = [
  { label: "Pending", value: "PENDING" },
  { label: "Cutting", value: "CUTTING" },
  { label: "Stitching", value: "STITCHING" },
  { label: "Ready", value: "READY" },
  { label: "Delivered", value: "DELIVERED" }
];

const activeStatuses: StitchingStatus[] = ["PENDING", "CUTTING", "STITCHING", "READY"];
const boardStatuses: StitchingStatus[] = [...activeStatuses, "DELIVERED"];

const statusMessages = {
  missing: {
    text: "Select a stitching order before updating it.",
    variant: "warning"
  },
  "tailor-required": {
    text: "Assign a tailor before moving this order to Stitching, Ready, or Delivered.",
    variant: "warning"
  },
  updated: {
    text: "Production order updated.",
    variant: "success"
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

function dateInputValue(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfWeek(value: Date) {
  const date = startOfDay(value);
  const day = date.getDay();
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  return date;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function startOfYear(value: Date) {
  return new Date(value.getFullYear(), 0, 1);
}

function getSelectedPeriod(value: string | string[] | undefined): ProductionPeriod {
  const selectedValue = Array.isArray(value) ? value[0] : value;

  if (
    selectedValue === "today" ||
    selectedValue === "week" ||
    selectedValue === "month" ||
    selectedValue === "year"
  ) {
    return selectedValue;
  }

  return "week";
}

function getPeriodRange(period: ProductionPeriod, today: Date) {
  if (period === "today") {
    return {
      end: addDays(today, 1),
      label: "today",
      start: today
    };
  }

  if (period === "month") {
    const start = startOfMonth(today);

    return {
      end: new Date(today.getFullYear(), today.getMonth() + 1, 1),
      label: "this month",
      start
    };
  }

  if (period === "year") {
    const start = startOfYear(today);

    return {
      end: new Date(today.getFullYear() + 1, 0, 1),
      label: "this year",
      start
    };
  }

  return {
    end: addDays(startOfWeek(today), 7),
    label: "this week",
    start: startOfWeek(today)
  };
}

function statusTone(status: StitchingStatus) {
  if (status === "DELIVERED") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (status === "READY") {
    return "border-indigo-100 bg-indigo-50 text-indigo-700";
  }

  if (status === "CANCELLED") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }

  if (status === "CUTTING" || status === "STITCHING") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-rose-100 bg-rose-50 text-rose-700";
}

function dueTone(dueDate: Date | null, today: Date) {
  if (!dueDate) {
    return "text-slate-500";
  }

  if (dueDate < today) {
    return "text-rose-700";
  }

  if (dueDate.toDateString() === today.toDateString()) {
    return "text-amber-700";
  }

  return "text-slate-600";
}

export default async function ProductionPage({
  searchParams
}: {
  searchParams?: Promise<{ period?: string | string[]; statusMessage?: string | string[] }>;
}) {
  const organizationId = await getCurrentOrganizationId();
  const params = await searchParams;
  const statusValue = Array.isArray(params?.statusMessage)
    ? params?.statusMessage[0]
    : params?.statusMessage;
  const statusMessage = getStatusMessage(statusMessages, statusValue);
  const selectedPeriod = getSelectedPeriod(params?.period);
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const periodRange = getPeriodRange(selectedPeriod, today);

  const [orders, tailors] = await Promise.all([
    prisma.stitchingOrder.findMany({
      include: {
        customer: {
          include: {
            _count: {
              select: {
                measurements: true
              }
            }
          }
        },
        saleItems: {
          include: {
            sale: true
          },
          take: 1
        },
        tailor: true
      },
      orderBy: [
        {
          dueDate: "asc"
        },
        {
          createdAt: "desc"
        }
      ],
      take: 80,
      where: {
        organizationId,
        OR: [
          {
            status: {
              in: activeStatuses
            }
          },
          {
            deliveredAt: {
              gte: periodRange.start,
              lt: periodRange.end
            },
            status: "DELIVERED"
          }
        ]
      }
    }),
    prisma.tailor.findMany({
      include: {
        stitchingOrders: {
          where: {
            organizationId,
            status: {
              in: activeStatuses
            }
          }
        }
      },
      orderBy: [
        {
          active: "desc"
        },
        {
          name: "asc"
        }
      ],
      where: {
        organizationId
      }
    }),
  ]);

  const activeOrders = orders.filter((order) => activeStatuses.includes(order.status));
  const deliveredOrders = orders.filter((order) => order.status === "DELIVERED");
  const overdueOrders = activeOrders.filter((order) => order.dueDate && order.dueDate < today);
  const dueTodayOrders = activeOrders.filter(
    (order) => order.dueDate && order.dueDate >= today && order.dueDate < tomorrow
  );
  const dueInPeriodOrders = activeOrders.filter(
    (order) =>
      order.dueDate && order.dueDate >= periodRange.start && order.dueDate < periodRange.end
  );
  const unassignedOrders = activeOrders.filter((order) => !order.tailorId);
  const readyOrders = activeOrders.filter((order) => order.status === "READY");
  const totalValue = activeOrders.reduce((sum, order) => sum + asNumber(order.stitchingCharge), 0);
  const ordersByStatus = productionStatuses
    .filter((status) => boardStatuses.includes(status.value))
    .map((status) => ({
      ...status,
      orders: orders.filter((order) => order.status === status.value)
    }));
  const activeTailors = tailors.filter((tailor) => tailor.active);

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.34),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(244,63,94,0.22),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(99,102,241,0.16),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl shadow-black/20">
                    <ClipboardList aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">
                      Production command center
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      Production
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Track active stitching work, spot delays, balance tailor workload, and move orders
                  through the shop from pending to delivered from one screen.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
                {[
                  { icon: ClipboardList, label: "Active orders", value: activeOrders.length },
                  { icon: AlertTriangle, label: "Overdue", value: overdueOrders.length },
                  { icon: PackageCheck, label: "Ready", value: readyOrders.length },
                  { icon: BadgeCheck, label: "Delivered", value: deliveredOrders.length }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white shadow-sm backdrop-blur"
                      key={stat.label}
                    >
                      <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-teal-300/15 text-teal-100">
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

        <section className="rounded-3xl border border-white/80 bg-white/90 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="px-2">
              <h2 className="text-sm font-semibold text-slate-950">Production period</h2>
              <p className="mt-1 text-xs text-slate-500">
                Delivered column and due planning are showing {periodRange.label}.
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {periodOptions.map((option) => (
                <Link
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                    selectedPeriod === option.value
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                      : "border border-slate-100 bg-white text-slate-600 hover:text-slate-950"
                  }`}
                  href={`/production?period=${option.value}` as Route}
                  key={option.value}
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
          <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Attention</h2>
                <p className="mt-1 text-sm text-slate-500">Work that needs a manager&apos;s eye.</p>
              </div>
              <span className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-950">
                {formatCurrency(totalValue)}
              </span>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                {
                  href: "#overdue",
                  icon: AlertTriangle,
                  label: "Overdue",
                  tone: "border-rose-100 bg-rose-50 text-rose-800",
                  value: overdueOrders.length
                },
                {
                  href: "#today",
                  icon: CalendarClock,
                  label: "Due today",
                  tone: "border-amber-100 bg-amber-50 text-amber-800",
                  value: dueTodayOrders.length
                },
                {
                  href: "#unassigned",
                  icon: UserRound,
                  label: "Unassigned",
                  tone: "border-sky-100 bg-sky-50 text-sky-800",
                  value: unassignedOrders.length
                }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${item.tone}`}
                    href={item.href}
                    key={item.label}
                  >
                    <Icon aria-hidden="true" className="size-5" />
                    <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                    <p className="mt-1 text-sm font-medium">{item.label}</p>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                <TimerReset aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {periodOptions.find((option) => option.value === selectedPeriod)?.label}
                </h2>
                <p className="text-sm text-slate-500">{dueInPeriodOrders.length} orders due</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {dueInPeriodOrders.slice(0, 5).map((order) => (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2" key={order.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {order.customer.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {order.orderNumber} - {order.garmentType}
                    </p>
                  </div>
                  <p className={`shrink-0 text-xs font-semibold ${dueTone(order.dueDate, today)}`}>
                    {formatDate(order.dueDate)}
                  </p>
                </div>
              ))}
              {!dueInPeriodOrders.length ? (
                <p className="rounded-2xl bg-slate-50 px-3 py-4 text-sm text-slate-500">
                  No active orders due in this period.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-5">
          {ordersByStatus.map((group) => (
            <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur" key={group.value}>
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-950">{group.label}</h2>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(group.value)}`}>
                    {group.orders.length}
                  </span>
                </div>
              </div>
              <div className="max-h-[42rem] space-y-3 overflow-y-auto p-3">
                {group.orders.length ? (
                  group.orders.map((order) => {
                    const invoice = order.saleItems[0]?.sale;
                    const isDelivered = order.status === "DELIVERED";

                    return (
                      <article className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm" key={order.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {order.customer.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {order.orderNumber} - {order.garmentType}
                            </p>
                          </div>
                          <span className={`shrink-0 text-xs font-semibold ${isDelivered ? "text-emerald-700" : dueTone(order.dueDate, today)}`}>
                            {isDelivered ? formatDate(order.deliveredAt) : formatDate(order.dueDate)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                            {order.tailor?.name ?? "Unassigned"}
                          </span>
                          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-700">
                            {formatCurrency(order.stitchingCharge)}
                          </span>
                          {isDelivered ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                              Delivered
                            </span>
                          ) : null}
                        </div>

                        <form action={updateStitchingOrder} className="mt-3 grid gap-2">
                          <input name="orderId" type="hidden" value={order.id} />
                          <input
                            name="returnTo"
                            type="hidden"
                            value={`/production?period=${selectedPeriod}`}
                          />
                          <input name="dueDate" type="hidden" value={dateInputValue(order.dueDate)} />
                          <input name="styleNotes" type="hidden" value={order.styleNotes ?? ""} />
                          <select
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-400"
                            defaultValue={order.status}
                            name="status"
                          >
                            {productionStatuses.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-teal-400"
                            defaultValue={order.tailorId ?? ""}
                            name="tailorId"
                          >
                            <option value="">Unassigned</option>
                            {activeTailors.map((tailor) => (
                              <option key={tailor.id} value={tailor.id}>
                                {tailor.name}
                              </option>
                            ))}
                          </select>
                          <PendingSubmitButton
                            className="h-10 rounded-xl bg-slate-950 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                            pendingText="Updating..."
                          >
                            Update
                          </PendingSubmitButton>
                        </form>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs font-semibold">
                          <Link
                            className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-800"
                            href={`/measurements?q=${encodeURIComponent(order.customer.phone)}` as Route}
                          >
                            <Eye aria-hidden="true" className="size-3.5" />
                            Measurements
                          </Link>
                          {invoice ? (
                            <Link
                              className="text-slate-600 hover:text-slate-950"
                              href={`/sales/${invoice.id}` as Route}
                            >
                              Invoice
                            </Link>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-2xl bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                    No orders here.
                  </p>
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-slate-950">Attention list</h2>
              <p className="mt-1 text-sm text-slate-500">Overdue, due today, and unassigned work.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                ...overdueOrders.map((order) => ({ label: "Overdue", order, tone: "text-rose-700" })),
                ...dueTodayOrders.map((order) => ({ label: "Due today", order, tone: "text-amber-700" })),
                ...unassignedOrders.map((order) => ({ label: "Unassigned", order, tone: "text-sky-700" }))
              ].slice(0, 10).map((item) => (
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" key={`${item.label}-${item.order.id}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950">
                      {item.order.customer.name} - {item.order.garmentType}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.order.orderNumber} - {formatDate(item.order.dueDate)} -{" "}
                      {item.order.tailor?.name ?? "Unassigned"}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${item.tone}`}>{item.label}</span>
                </div>
              ))}
              {!overdueOrders.length && !dueTodayOrders.length && !unassignedOrders.length ? (
                <p className="p-6 text-center text-sm text-slate-500">No urgent production issues.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-700">
                <Scissors aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Tailor workload</h2>
                <p className="text-sm text-slate-500">Active assigned work</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {tailors.map((tailor) => {
                const workload = tailor.stitchingOrders.length;
                const maxWorkload = Math.max(...tailors.map((item) => item.stitchingOrders.length), 1);

                return (
                  <div className="rounded-2xl bg-slate-50 p-3" key={tailor.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{tailor.name}</p>
                        <p className="text-xs text-slate-500">
                          {tailor.active ? "Active" : "Inactive"}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-950">{workload}</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-fuchsia-500"
                        style={{ width: `${Math.max(8, (workload / maxWorkload) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
