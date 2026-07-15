import Link from "next/link";
import type { Route } from "next";
import type { Prisma, StitchingStatus } from "@prisma/client";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ClipboardList,
  PackageCheck,
  Scissors,
  Search,
  UserRound
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { prisma } from "@/lib/prisma";

import { updateStitchingOrder } from "./actions";

export const dynamic = "force-dynamic";

type DecimalLike = {
  toNumber: () => number;
};

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Pending", value: "PENDING" },
  { label: "Cutting", value: "CUTTING" },
  { label: "Stitching", value: "STITCHING" },
  { label: "Ready", value: "READY" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" }
] as const;

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
    text: "Stitching order updated.",
    variant: "success"
  }
} as const;

type StatusFilter = "all" | StitchingStatus;

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

function getStatus(value: string | string[] | undefined): StatusFilter {
  const selectedValue = Array.isArray(value) ? value[0] : value;

  if (
    selectedValue === "PENDING" ||
    selectedValue === "CUTTING" ||
    selectedValue === "STITCHING" ||
    selectedValue === "READY" ||
    selectedValue === "DELIVERED" ||
    selectedValue === "CANCELLED"
  ) {
    return selectedValue;
  }

  return "all";
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

  if (status === "CUTTING" || status === "STITCHING") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-rose-100 bg-rose-50 text-rose-700";
}

function dateInputValue(value: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString().slice(0, 10);
}

export default async function StitchingOrdersPage({
  searchParams
}: {
  searchParams?: Promise<{
    q?: string | string[];
    status?: string | string[];
    statusMessage?: string | string[];
    updated?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const selectedStatus = getStatus(params?.status);
  const queryValue = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const updatedValue = Array.isArray(params?.updated) ? params?.updated[0] : params?.updated;
  const statusValue = Array.isArray(params?.statusMessage) ? params?.statusMessage[0] : params?.statusMessage;
  const query = queryValue?.trim() ?? "";
  const statusMessage = getStatusMessage(
    statusMessages,
    statusValue ?? (updatedValue === "1" ? "updated" : undefined)
  );
  const returnTo = `/stitching-orders?${new URLSearchParams({
    ...(query ? { q: query } : {}),
    status: selectedStatus
  }).toString()}`;
  const statusWhere: Prisma.StitchingOrderWhereInput =
    selectedStatus === "all" ? {} : { status: selectedStatus };
  const queryWhere: Prisma.StitchingOrderWhereInput = query
    ? {
        OR: [
          { orderNumber: { contains: query, mode: "insensitive" as const } },
          { garmentType: { contains: query, mode: "insensitive" as const } },
          { customer: { name: { contains: query, mode: "insensitive" as const } } },
          { customer: { phone: { contains: query, mode: "insensitive" as const } } },
          { tailor: { name: { contains: query, mode: "insensitive" as const } } }
        ]
      }
    : {};
  const where: Prisma.StitchingOrderWhereInput = {
    ...statusWhere,
    ...queryWhere
  };

  const [orders, tailors, totalCount, pendingCount, readyCount, deliveredCount] = await Promise.all([
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
      take: 60,
      where
    }),
    prisma.tailor.findMany({
      orderBy: {
        name: "asc"
      },
      where: {
        active: true
      }
    }),
    prisma.stitchingOrder.count({
      where
    }),
    prisma.stitchingOrder.count({
      where: {
        ...queryWhere,
        status: {
          in: ["PENDING", "CUTTING", "STITCHING"]
        }
      }
    }),
    prisma.stitchingOrder.count({
      where: {
        ...queryWhere,
        status: "READY"
      }
    }),
    prisma.stitchingOrder.count({
      where: {
        ...queryWhere,
        status: "DELIVERED"
      }
    })
  ]);

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.34),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(168,85,247,0.24),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(14,165,233,0.14),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl shadow-black/20">
                    <ClipboardList aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">
                      Production queue
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      Stitching Orders
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Assign tailors, track due dates, and move custom work from pending to delivered.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
                {[
                  { icon: ClipboardList, label: "Orders", value: totalCount },
                  { icon: Clock3, label: "In progress", value: pendingCount },
                  { icon: PackageCheck, label: "Ready", value: readyCount },
                  { icon: BadgeCheck, label: "Delivered", value: deliveredCount }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white shadow-sm backdrop-blur"
                      key={stat.label}
                    >
                      <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-rose-300/15 text-rose-100">
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
            <form action="/stitching-orders" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[30rem]">
              <input name="status" type="hidden" value={selectedStatus} />
              <label className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  defaultValue={query}
                  name="q"
                  placeholder="Search order, customer, phone, tailor"
                />
              </label>
              <button className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm">
                Search
              </button>
            </form>

            <div className="flex gap-2 overflow-x-auto">
              {statusOptions.map((option) => {
                const href = `/stitching-orders?${new URLSearchParams({
                  ...(query ? { q: query } : {}),
                  status: option.value
                }).toString()}` as Route;

                return (
                  <Link
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      selectedStatus === option.value
                        ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                        : "border border-slate-100 bg-white text-slate-600 hover:text-slate-950"
                    }`}
                    href={href}
                    key={option.value}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Order queue</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing {orders.length} of {totalCount} matching stitching orders.
                </p>
              </div>
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
                href="/invoices"
              >
                <UserRound aria-hidden="true" className="size-4" />
                Open invoices
              </Link>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {orders.length ? (
              orders.map((order) => {
                const invoice = order.saleItems[0]?.sale;

                return (
                  <article className="bg-white p-5 transition hover:bg-rose-50/20" key={order.id}>
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_13rem_11rem]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-950">
                            {order.orderNumber}
                          </h3>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(order.status)}`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          {order.garmentType} for {order.customer.name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{order.customer.phone}</span>
                          <span>Tailor: {order.tailor?.name ?? "Unassigned"}</span>
                          <Link
                            className="font-semibold text-amber-700 hover:text-amber-800"
                            href={`/measurements?q=${encodeURIComponent(order.customer.phone)}` as Route}
                          >
                            {order.customer._count.measurements} measurement profile
                            {order.customer._count.measurements === 1 ? "" : "s"}
                          </Link>
                          {invoice ? (
                            <Link
                              className="font-semibold text-rose-700 hover:text-rose-800"
                              href={`/sales/${invoice.id}` as Route}
                            >
                              Invoice {invoice.invoiceNumber}
                            </Link>
                          ) : (
                            <span>No linked invoice</span>
                          )}
                        </div>
                        {order.styleNotes ? (
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                            {order.styleNotes}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-400">Due date</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-950">
                          <CalendarClock aria-hidden="true" className="size-4 text-slate-400" />
                          {formatDate(order.dueDate)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-400">Charge</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">
                          {formatCurrency(order.stitchingCharge)}
                        </p>
                      </div>

                    </div>

                    <details className="group mt-4">
                      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                        <Scissors aria-hidden="true" className="size-4" />
                        Manage order
                        <span className="ml-auto text-xs text-rose-500 group-open:hidden">
                          Open
                        </span>
                        <span className="ml-auto hidden text-xs text-slate-500 group-open:inline">
                          Close
                        </span>
                      </summary>

                      <form
                        action={updateStitchingOrder}
                        className="mt-3 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2"
                      >
                        <input name="orderId" type="hidden" value={order.id} />
                        <input name="returnTo" type="hidden" value={returnTo} />
                        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                          Status
                          <select
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-400"
                            defaultValue={order.status}
                            name="status"
                          >
                            {statusOptions
                              .filter((option) => option.value !== "all")
                              .map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                          Tailor
                          <select
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-400"
                            defaultValue={order.tailorId ?? ""}
                            name="tailorId"
                          >
                            <option value="">Unassigned</option>
                            {tailors.map((tailor) => (
                              <option key={tailor.id} value={tailor.id}>
                                {tailor.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                          Due date
                          <input
                            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-rose-400"
                            defaultValue={dateInputValue(order.dueDate)}
                            name="dueDate"
                            type="date"
                          />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                          Style notes
                          <textarea
                            className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400"
                            defaultValue={order.styleNotes ?? ""}
                            name="styleNotes"
                            placeholder="Fitting notes, fabric notes, delivery instructions"
                          />
                        </label>
                        <button className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white md:col-span-2">
                          Save order
                        </button>
                      </form>
                    </details>
                  </article>
                );
              })
            ) : (
              <div className="p-10 text-center">
                <CheckCircle2 aria-hidden="true" className="mx-auto size-10 text-emerald-600" />
                <p className="mt-3 text-sm font-semibold text-slate-950">No stitching orders found</p>
                <p className="mt-1 text-sm text-slate-500">
                  New stitching work appears here when a sale includes a stitching service.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
