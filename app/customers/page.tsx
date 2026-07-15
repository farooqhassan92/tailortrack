import { AppShell } from "@/components/layout/app-shell";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { prisma } from "@/lib/prisma";
import {
  Archive,
  Banknote,
  ClipboardList,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Search,
  UserRound,
  Users
} from "lucide-react";

import { archiveOrDeleteCustomer, createCustomer, updateCustomer } from "./actions";

export const dynamic = "force-dynamic";

type DecimalLike = {
  toNumber: () => number;
};

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

const statusMessages = {
  archived: {
    text: "Customer removed from active records.",
    variant: "success"
  },
  created: {
    text: "Customer profile created.",
    variant: "success"
  },
  "duplicate-phone": {
    text: "A customer with this phone number already exists. Search the customer list or use a different phone number.",
    variant: "warning"
  },
  "invalid-number": {
    text: "Enter valid measurement numbers before saving the customer.",
    variant: "warning"
  },
  missing: {
    text: "Customer name and phone are required.",
    variant: "warning"
  },
  updated: {
    text: "Customer profile updated.",
    variant: "success"
  }
} as const;

const measurementFields = [
  { label: "Shirt length", name: "shirtLength" },
  { label: "Shoulder", name: "shoulder" },
  { label: "Chest", name: "chest" },
  { label: "Waist", name: "waist" },
  { label: "Sleeve", name: "sleeve" },
  { label: "Collar", name: "collar" },
  { label: "Trouser length", name: "trouserLength" },
  { label: "Trouser waist", name: "trouserWaist" },
  { label: "Inseam", name: "inseam" }
] as const;

export default async function CustomersPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string | string[]; status?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const status = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const normalizedQuery = query?.trim() ?? "";
  const statusMessage = getStatusMessage(statusMessages, status);

  const [customers, customerCount, totals] = await Promise.all([
    prisma.customer.findMany({
      include: {
        _count: {
          select: {
            measurements: true,
            sales: true,
            stitchingOrders: true
          }
        },
        sales: {
          orderBy: {
            createdAt: "desc"
          },
          select: {
            id: true,
            invoiceNumber: true,
            paidAmount: true,
            total: true
          },
          take: 5
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      where: {
        archivedAt: null,
        ...(normalizedQuery
          ? {
              OR: [
                { name: { contains: normalizedQuery, mode: "insensitive" as const } },
                { phone: { contains: normalizedQuery, mode: "insensitive" as const } },
                { address: { contains: normalizedQuery, mode: "insensitive" as const } }
              ]
            }
          : {})
      }
    }),
    prisma.customer.count({
      where: {
        archivedAt: null
      }
    }),
    prisma.sale.aggregate({
      _sum: {
        paidAmount: true,
        total: true
      },
      where: {
        customerId: {
          not: null
        }
      }
    })
  ]);

  const customerSalesTotal = asNumber(totals._sum.total);
  const customerPaidTotal = asNumber(totals._sum.paidAmount);
  const customerBalance = customerSalesTotal - customerPaidTotal;

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-violet-950 shadow-2xl shadow-violet-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.38),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(236,72,153,0.24),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(14,165,233,0.16),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-violet-950 shadow-xl shadow-black/20">
                    <Users aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
                      Client records
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      Customers
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-violet-100 sm:text-base">
                  Keep customer contact details, sales history, balances, and future stitching
                  profiles in one place.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
                {[
                  { icon: UserRound, label: "Customers", value: customerCount },
                  { icon: ReceiptText, label: "Shown", value: customers.length },
                  { icon: Banknote, label: "Customer sales", value: formatCurrency(customerSalesTotal) },
                  { icon: ClipboardList, label: "Balance", value: formatCurrency(customerBalance) }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white shadow-sm backdrop-blur"
                      key={stat.label}
                    >
                      <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-fuchsia-300/15 text-fuchsia-100">
                        <Icon aria-hidden="true" className="size-4" />
                      </div>
                      <p className="text-xs font-medium text-violet-100">{stat.label}</p>
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
          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-sm backdrop-blur">
            <div className="border-b border-slate-100 bg-gradient-to-br from-white to-violet-50/70 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Customer list</h2>
                  <p className="text-sm text-slate-500">{customers.length} active profiles shown</p>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  Active customers
                </span>
              </div>

              <form className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" action="/customers">
                <label className="relative">
                  <Search
                    aria-hidden="true"
                    className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    defaultValue={normalizedQuery}
                    name="q"
                    placeholder="Search name, phone, or address"
                  />
                </label>
                <button className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm">
                  Search
                </button>
              </form>
            </div>

            <div className="divide-y divide-slate-100">
              {customers.length ? (
                customers.map((customer) => {
                  const total = customer.sales.reduce(
                    (sum, sale) => sum + asNumber(sale.total),
                    0
                  );
                  const paid = customer.sales.reduce(
                    (sum, sale) => sum + asNumber(sale.paidAmount),
                    0
                  );
                  const balance = total - paid;

                  return (
                    <div className="bg-white/90 p-5 transition hover:bg-violet-50/40" key={customer.id}>
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_5rem]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-slate-950">
                              {customer.name}
                            </h3>
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                              {customer._count.sales} sales
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <Phone aria-hidden="true" className="size-4" />
                              {customer.phone}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin aria-hidden="true" className="size-4" />
                              {customer.address || "No address"}
                            </span>
                          </div>
                          {customer.notes ? (
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                              {customer.notes}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-400">Recent sales</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">
                            {formatCurrency(total)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-slate-400">Balance</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">
                            {formatCurrency(balance)}
                          </p>
                        </div>

                        <form action={archiveOrDeleteCustomer} className="flex lg:justify-end">
                          <input name="customerId" type="hidden" value={customer.id} />
                          <button
                            className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                            title="Archive or delete customer"
                            type="submit"
                          >
                            <Archive aria-hidden="true" className="size-4" />
                            <span className="sr-only">Archive or delete {customer.name}</span>
                          </button>
                        </form>
                      </div>

                      <details className="group mt-4">
                        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-50">
                          <Pencil aria-hidden="true" className="size-4" />
                          Edit customer
                          <span className="ml-auto text-xs text-violet-500 group-open:hidden">
                            Open
                          </span>
                          <span className="ml-auto hidden text-xs text-slate-500 group-open:inline">
                            Close
                          </span>
                        </summary>

                        <form
                          action={updateCustomer}
                          className="mt-3 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2"
                        >
                          <input name="customerId" type="hidden" value={customer.id} />
                          <input
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
                            defaultValue={customer.name}
                            name="name"
                            placeholder="Name"
                            required
                          />
                          <input
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
                            defaultValue={customer.phone}
                            name="phone"
                            placeholder="Phone"
                            required
                          />
                          <input
                            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 md:col-span-2"
                            defaultValue={customer.address ?? ""}
                            name="address"
                            placeholder="Address"
                          />
                          <textarea
                            className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 md:col-span-2"
                            defaultValue={customer.notes ?? ""}
                            name="notes"
                            placeholder="Notes"
                          />
                          <button className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white md:col-span-2">
                            Save customer
                          </button>
                        </form>
                      </details>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-slate-950">No customers found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add your first customer profile to connect sales and stitching work.
                  </p>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5">
            <details className="group rounded-3xl border border-violet-100/80 bg-gradient-to-br from-white to-violet-50/60 p-5 shadow-sm backdrop-blur" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
                    <Plus aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-950">
                      Add customer
                    </span>
                    <span className="block text-xs text-slate-500">Required for named sales</span>
                  </span>
                </span>
                <span className="text-sm font-semibold text-violet-700 group-open:hidden">
                  Open
                </span>
                <span className="hidden text-sm font-semibold text-slate-500 group-open:inline">
                  Close
                </span>
              </summary>

              <form action={createCustomer} className="mt-5 grid gap-3">
                <input
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-violet-400"
                  name="name"
                  placeholder="Customer name"
                  required
                />
                <input
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-violet-400"
                  name="phone"
                  placeholder="Phone number"
                  required
                />
                <input
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-violet-400"
                  name="address"
                  placeholder="Address"
                />
                <textarea
                  className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400"
                  name="notes"
                  placeholder="Notes"
                />
                <details className="group rounded-2xl border border-violet-100 bg-white/80 p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-violet-700">
                    Initial measurements
                    <span className="text-xs text-violet-500 group-open:hidden">Open</span>
                    <span className="hidden text-xs text-slate-500 group-open:inline">Close</span>
                  </summary>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <input
                      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 sm:col-span-2"
                      name="measurementLabel"
                      placeholder="Profile label, e.g. Default"
                    />
                    {measurementFields.map((field) => (
                      <input
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
                        key={field.name}
                        min="0"
                        name={field.name}
                        placeholder={field.label}
                        step="0.01"
                        type="number"
                      />
                    ))}
                    <textarea
                      className="min-h-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400 sm:col-span-2"
                      name="measurementStyleNotes"
                      placeholder="Fit preference, collar, cuff, trouser style"
                    />
                  </div>
                </details>
                <button className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm">
                  Add customer
                </button>
              </form>
            </details>

            <section className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-fuchsia-50 text-fuchsia-700">
                  <ReceiptText aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Sales connection</h2>
                  <p className="text-xs text-slate-500">Customers appear in sales selection</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>Attach sales to a customer to track balance and history.</p>
                <p>Walk-in sales can still be created without a customer.</p>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
