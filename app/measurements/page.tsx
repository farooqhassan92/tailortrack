import {
  ClipboardList,
  Pencil,
  Plus,
  Ruler,
  Search,
  Shirt,
  UserRound
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

import { createMeasurement, updateMeasurement } from "./actions";

export const dynamic = "force-dynamic";

type DecimalLike = {
  toNumber: () => number;
};

type MeasurementValueKey =
  | "shirtLength"
  | "shoulder"
  | "chest"
  | "waist"
  | "sleeve"
  | "collar"
  | "trouserLength"
  | "trouserWaist"
  | "inseam";

const measurementFields: Array<{ key: MeasurementValueKey; label: string; placeholder: string }> = [
  { key: "shirtLength", label: "Shirt length", placeholder: "Length" },
  { key: "shoulder", label: "Shoulder", placeholder: "Shoulder" },
  { key: "chest", label: "Chest", placeholder: "Chest" },
  { key: "waist", label: "Waist", placeholder: "Waist" },
  { key: "sleeve", label: "Sleeve", placeholder: "Sleeve" },
  { key: "collar", label: "Collar", placeholder: "Collar" },
  { key: "trouserLength", label: "Trouser length", placeholder: "Length" },
  { key: "trouserWaist", label: "Trouser waist", placeholder: "Waist" },
  { key: "inseam", label: "Inseam", placeholder: "Inseam" }
];

const statusMessages = {
  created: {
    text: "Measurement profile created.",
    variant: "success"
  },
  "invalid-number": {
    text: "Enter valid measurement numbers before saving.",
    variant: "warning"
  },
  missing: {
    text: "Select a customer before saving measurements.",
    variant: "warning"
  },
  updated: {
    text: "Measurement profile updated.",
    variant: "success"
  }
} as const;

function asNumber(value: DecimalLike | number | null | undefined) {
  if (!value) {
    return "";
  }

  return typeof value === "number" ? String(value) : String(value.toNumber());
}

function formatMeasurement(value: DecimalLike | number | null | undefined) {
  if (!value) {
    return "-";
  }

  return `${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 2
  }).format(typeof value === "number" ? value : value.toNumber())}"`;
}

export default async function MeasurementsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string | string[]; status?: string | string[] }>;
}) {
  const organizationId = await getCurrentOrganizationId();
  const params = await searchParams;
  const queryValue = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const status = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const query = queryValue?.trim() ?? "";
  const returnTo = `/measurements?${new URLSearchParams(query ? { q: query } : {}).toString()}`;
  const statusMessage = getStatusMessage(statusMessages, status);

  const [customers, profileCount, customerCount] = await Promise.all([
    prisma.customer.findMany({
      include: {
        measurements: {
          orderBy: {
            updatedAt: "desc"
          }
        },
        _count: {
          select: {
            stitchingOrders: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 40,
      where: {
        archivedAt: null,
        organizationId,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" as const } },
                { phone: { contains: query, mode: "insensitive" as const } }
              ]
            }
          : {})
      }
    }),
    prisma.customerMeasurement.count({
      where: {
        organizationId
      }
    }),
    prisma.customer.count({
      where: {
        archivedAt: null,
        organizationId
      }
    })
  ]);

  const customersWithMeasurements = customers.filter((customer) => customer.measurements.length).length;

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-amber-950 shadow-2xl shadow-amber-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.38),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(249,115,22,0.24),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(20,184,166,0.14),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-amber-950 shadow-xl shadow-black/20">
                    <Ruler aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
                      Fit library
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      Measurements
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-amber-100 sm:text-base">
                  Save reusable customer measurement profiles for stitching orders and fitting
                  history.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
                {[
                  { icon: UserRound, label: "Customers", value: customerCount },
                  { icon: ClipboardList, label: "Profiles", value: profileCount },
                  { icon: Shirt, label: "Shown with fit", value: customersWithMeasurements },
                  { icon: Ruler, label: "Shown", value: customers.length }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white shadow-sm backdrop-blur"
                      key={stat.label}
                    >
                      <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-amber-300/15 text-amber-100">
                        <Icon aria-hidden="true" className="size-4" />
                      </div>
                      <p className="text-xs font-medium text-amber-100">{stat.label}</p>
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
          <form action="/measurements" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              />
              <input
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                defaultValue={query}
                name="q"
                placeholder="Search customer name or phone"
              />
            </label>
            <button className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm">
              Search
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Customer measurements</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing {customers.length} active customer{customers.length === 1 ? "" : "s"}.
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Inches
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {customers.length ? (
              customers.map((customer) => (
                <article className="bg-white p-5 transition hover:bg-amber-50/30" key={customer.id}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-950">{customer.name}</h3>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {customer.measurements.length} profile
                          {customer.measurements.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {customer.phone} - {customer._count.stitchingOrders} stitching order
                        {customer._count.stitchingOrders === 1 ? "" : "s"}
                      </p>
                    </div>

                    <details className="group">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm">
                        <Plus aria-hidden="true" className="size-4" />
                        Add profile
                      </summary>
                      <form
                        action={createMeasurement}
                        className="mt-3 grid min-w-[min(34rem,calc(100vw-3rem))] gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-3"
                      >
                        <input name="customerId" type="hidden" value={customer.id} />
                        <input name="returnTo" type="hidden" value={returnTo} />
                        <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-3">
                          Profile label
                          <input
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
                            name="label"
                            placeholder="Default, Eid suit, waistcoat"
                          />
                        </label>
                        {measurementFields.map((field) => (
                          <label
                            className="grid gap-1.5 text-sm font-medium text-slate-700"
                            key={field.key}
                          >
                            {field.label}
                            <input
                              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
                              min="0"
                              name={field.key}
                              placeholder={field.placeholder}
                              step="0.01"
                              type="number"
                            />
                          </label>
                        ))}
                        <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-3">
                          Style notes
                          <textarea
                            className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                            name="styleNotes"
                            placeholder="Fit preference, collar, cuff, trouser style"
                          />
                        </label>
                        <button className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white md:col-span-3">
                          Save profile
                        </button>
                      </form>
                    </details>
                  </div>

                  {customer.measurements.length ? (
                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                      {customer.measurements.map((measurement) => (
                        <section
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                          key={measurement.id}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-950">
                                {measurement.label}
                              </h4>
                              <p className="mt-1 text-xs text-slate-500">
                                Updated {measurement.updatedAt.toLocaleDateString("en-PK")}
                              </p>
                            </div>
                            <details className="group">
                              <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2 text-xs font-semibold text-amber-700">
                                <Pencil aria-hidden="true" className="size-3.5" />
                                Edit
                              </summary>
                              <form
                                action={updateMeasurement}
                                className="mt-3 grid gap-3 rounded-2xl border border-slate-100 bg-white p-4 md:grid-cols-3"
                              >
                                <input name="measurementId" type="hidden" value={measurement.id} />
                                <input name="returnTo" type="hidden" value={returnTo} />
                                <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-3">
                                  Profile label
                                  <input
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
                                    defaultValue={measurement.label}
                                    name="label"
                                  />
                                </label>
                                {measurementFields.map((field) => (
                                  <label
                                    className="grid gap-1.5 text-sm font-medium text-slate-700"
                                    key={field.key}
                                  >
                                    {field.label}
                                    <input
                                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-amber-400"
                                      defaultValue={asNumber(measurement[field.key])}
                                      min="0"
                                      name={field.key}
                                      step="0.01"
                                      type="number"
                                    />
                                  </label>
                                ))}
                                <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-3">
                                  Style notes
                                  <textarea
                                    className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
                                    defaultValue={measurement.styleNotes ?? ""}
                                    name="styleNotes"
                                  />
                                </label>
                                <button className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white md:col-span-3">
                                  Save changes
                                </button>
                              </form>
                            </details>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                            {measurementFields.map((field) => (
                              <div className="rounded-xl bg-white px-3 py-2" key={field.key}>
                                <p className="text-xs text-slate-400">{field.label}</p>
                                <p className="mt-1 font-semibold text-slate-950">
                                  {formatMeasurement(measurement[field.key])}
                                </p>
                              </div>
                            ))}
                          </div>
                          {measurement.styleNotes ? (
                            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm leading-6 text-slate-600">
                              {measurement.styleNotes}
                            </p>
                          ) : null}
                        </section>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4 text-sm text-amber-800">
                      No measurement profile yet. Add one before creating detailed stitching work.
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="p-10 text-center">
                <Ruler aria-hidden="true" className="mx-auto size-10 text-amber-600" />
                <p className="mt-3 text-sm font-semibold text-slate-950">No customers found</p>
                <p className="mt-1 text-sm text-slate-500">
                  Add customers first, then save their measurement profiles here.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
