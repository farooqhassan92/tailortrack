import Link from "next/link";
import type { Route } from "next";
import {
  BadgeCheck,
  Clock3,
  Eye,
  Pencil,
  Phone,
  Plus,
  Scissors,
  Search,
  ToggleLeft,
  ToggleRight,
  UserRound
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

import { createTailor, toggleTailorActive, updateTailor } from "./actions";

export const dynamic = "force-dynamic";

type DecimalLike = {
  toNumber: () => number;
};

const statusMessages = {
  activated: {
    text: "Tailor activated.",
    variant: "success"
  },
  created: {
    text: "Tailor profile created.",
    variant: "success"
  },
  deactivated: {
    text: "Tailor deactivated.",
    variant: "info"
  },
  missing: {
    text: "Tailor name is required.",
    variant: "warning"
  },
  updated: {
    text: "Tailor profile updated.",
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

function normalizeRateKey(value: string) {
  return value.trim().toLowerCase();
}

export default async function TailorsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string | string[]; status?: string | string[] }>;
}) {
  const organizationId = await getCurrentOrganizationId();
  const params = await searchParams;
  const queryValue = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const status = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const query = queryValue?.trim() ?? "";
  const statusMessage = getStatusMessage(statusMessages, status);

  const [
    tailors,
    activeCount,
    inactiveCount,
    openOrderCount,
    deliveredCount,
    stitchingRates
  ] = await Promise.all([
    prisma.tailor.findMany({
      include: {
        stitchingOrders: {
          include: {
            salaryLines: {
              include: {
                batch: {
                  select: {
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
      orderBy: [
        {
          active: "desc"
        },
        {
          name: "asc"
        }
      ],
      where: query
        ? {
            organizationId,
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { phone: { contains: query, mode: "insensitive" as const } }
            ]
          }
        : { organizationId }
    }),
    prisma.tailor.count({
      where: {
        organizationId,
        active: true
      }
    }),
    prisma.tailor.count({
      where: {
        organizationId,
        active: false
      }
    }),
    prisma.stitchingOrder.count({
      where: {
        tailorId: {
          not: null
        },
        organizationId,
        status: {
          in: ["PENDING", "CUTTING", "STITCHING", "READY"]
        }
      }
    }),
    prisma.stitchingOrder.count({
      where: {
        tailorId: {
          not: null
        },
        organizationId,
        status: "DELIVERED"
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
    stitchingRates.map((rate) => [normalizeRateKey(rate.name), rate.costPrice])
  );

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.55),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(168,85,247,0.22),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(14,165,233,0.14),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl shadow-black/20">
                    <Scissors aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Team workflow
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      Tailors
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Manage tailor profiles and review assigned stitching workload.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
                {[
                  { icon: UserRound, label: "Active", value: activeCount },
                  { icon: ToggleLeft, label: "Inactive", value: inactiveCount },
                  { icon: Clock3, label: "Open work", value: openOrderCount },
                  { icon: BadgeCheck, label: "Delivered", value: deliveredCount }
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

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Tailor list</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Showing {tailors.length} tailor{tailors.length === 1 ? "" : "s"}.
                  </p>
                </div>
                <form action="/tailors" className="grid w-full gap-3 sm:w-auto sm:grid-cols-[18rem_auto]">
                  <label className="relative">
                    <Search
                      aria-hidden="true"
                      className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                      defaultValue={query}
                      name="q"
                      placeholder="Search tailor"
                    />
                  </label>
                  <button className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm">
                    Search
                  </button>
                </form>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {tailors.length ? (
                tailors.map((tailor) => {
                  const openOrders = tailor.stitchingOrders.filter((order) =>
                    ["PENDING", "CUTTING", "STITCHING", "READY"].includes(order.status)
                  );
                  const deliveredOrders = tailor.stitchingOrders.filter(
                    (order) => order.status === "DELIVERED"
                  );
                  const payableOrders = tailor.stitchingOrders.filter((order) => {
                    const isPayableStatus = ["READY", "DELIVERED"].includes(order.status);
                    const hasActiveSalaryLine = order.salaryLines.some(
                      (line) => line.batch.voidedAt === null
                    );

                    return isPayableStatus && !hasActiveSalaryLine;
                  });
                  const pendingPayable = payableOrders.reduce((sum, order) => {
                    const rate = rateByGarmentType.get(normalizeRateKey(order.garmentType));

                    return sum + asNumber(rate);
                  }, 0);

                  return (
                    <article className="bg-white p-5 transition hover:bg-slate-50" key={tailor.id}>
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_9rem_9rem_9rem]">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-950">
                              {tailor.name}
                            </h3>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                tailor.active
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {tailor.active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500">
                            <Phone aria-hidden="true" className="size-4" />
                            {tailor.phone || "No phone"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Open work</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">
                            {openOrders.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Delivered</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">
                            {deliveredOrders.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-400">Pending payable</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">
                            {formatCurrency(pendingPayable)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {payableOrders.length} unpaid job{payableOrders.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-sm"
                          href={`/tailors/${tailor.id}` as Route}
                        >
                          <Eye aria-hidden="true" className="size-3.5" />
                          View work
                        </Link>
                        <details className="group">
                          <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                            <Pencil aria-hidden="true" className="size-3.5" />
                            Edit profile
                          </summary>
                          <form
                            action={updateTailor}
                            className="mt-3 grid min-w-[min(26rem,calc(100vw-3rem))] gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          >
                            <input name="tailorId" type="hidden" value={tailor.id} />
                            <input
                              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                              defaultValue={tailor.name}
                              name="name"
                              placeholder="Tailor name"
                              required
                            />
                            <input
                              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
                              defaultValue={tailor.phone ?? ""}
                              name="phone"
                              placeholder="Phone"
                            />
                            <button className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">
                              Save tailor
                            </button>
                          </form>
                        </details>

                        <form action={toggleTailorActive}>
                          <input name="tailorId" type="hidden" value={tailor.id} />
                          <input name="active" type="hidden" value={String(!tailor.active)} />
                          <button
                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                              tailor.active
                                ? "bg-slate-100 text-slate-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {tailor.active ? (
                              <ToggleLeft aria-hidden="true" className="size-3.5" />
                            ) : (
                              <ToggleRight aria-hidden="true" className="size-3.5" />
                            )}
                            {tailor.active ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="p-10 text-center">
                  <Scissors aria-hidden="true" className="mx-auto size-10 text-slate-500" />
                  <p className="mt-3 text-sm font-semibold text-slate-950">No tailors found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add a tailor profile to assign stitching work.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <details className="group rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Plus aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-950">
                      Add tailor
                    </span>
                    <span className="block text-xs text-slate-500">Available for assignments</span>
                  </span>
                </span>
                <span className="text-sm font-semibold text-slate-700 group-open:hidden">
                  Open
                </span>
                <span className="hidden text-sm font-semibold text-slate-500 group-open:inline">
                  Close
                </span>
              </summary>

              <form action={createTailor} className="mt-5 grid gap-3">
                <input
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400"
                  name="name"
                  placeholder="Tailor name"
                  required
                />
                <input
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400"
                  name="phone"
                  placeholder="Phone"
                />
                <button className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm">
                  Add tailor
                </button>
              </form>
            </details>

            <section className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                  <Clock3 aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Assignment rule</h2>
                  <p className="text-xs text-slate-500">Active tailors only</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>Inactive tailors stay visible here for history.</p>
                <p>Only active tailors appear in stitching order assignment menus.</p>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
