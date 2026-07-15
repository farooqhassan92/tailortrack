import Link from "next/link";
import type { Route } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { prisma } from "@/lib/prisma";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  PackageCheck,
  ReceiptText,
  Search,
  ShoppingBag,
  UserRound,
  Users
} from "lucide-react";

import { createInventorySale } from "./actions";
import { BillTotalPreview } from "./bill-total-preview";

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

function formatQuantity(value: DecimalLike | number | null | undefined, unit: string) {
  return `${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 2
  }).format(asNumber(value))} ${unit}`;
}

function formatCurrency(value: DecimalLike | number | null | undefined) {
  return `Rs. ${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0
  }).format(asNumber(value))}`;
}

const statusMessages = {
  created: {
    text: "Sale created and inventory stock was reduced automatically.",
    variant: "success"
  },
  missing: {
    text: "Select an item and enter a quantity before creating a sale.",
    variant: "warning"
  },
  "invalid-product": {
    text: "That inventory item is not available for sale.",
    variant: "error"
  },
  "insufficient-stock": {
    text: "Not enough stock is available for that sale quantity.",
    variant: "error"
  },
  "customer-required": {
    text: "Select a customer before creating a stitching order.",
    variant: "warning"
  },
  "measurement-required": {
    text: "This customer has no measurement profile. Add measurements before creating a stitching order.",
    variant: "warning"
  },
  "walk-in-full-payment-required": {
    text: "Walk-in customers must pay the full invoice amount. Select a customer profile to leave a balance unpaid.",
    variant: "warning"
  },
  "invalid-number": {
    text: "Enter valid numbers before creating a sale.",
    variant: "warning"
  }
} as const;

export default async function SalesPage({
  searchParams
}: {
  searchParams?: Promise<{
    customerId?: string | string[];
    customerQuery?: string | string[];
    status?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const status = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const customerQueryValue = Array.isArray(params?.customerQuery)
    ? params?.customerQuery[0]
    : params?.customerQuery;
  const selectedCustomerId = Array.isArray(params?.customerId)
    ? params?.customerId[0]
    : params?.customerId;
  const customerQuery = customerQueryValue?.trim() ?? "";
  const statusMessage = getStatusMessage(statusMessages, status);

  const [products, selectedCustomer, customerMatches, recentSales, totals] = await Promise.all([
    prisma.product.findMany({
      orderBy: {
        name: "asc"
      },
      where: {
        archivedAt: null,
        type: {
          not: "STITCHING_SERVICE"
        }
      }
    }),
    selectedCustomerId
      ? prisma.customer.findFirst({
          include: {
            _count: {
              select: {
                measurements: true
              }
            }
          },
          where: {
            archivedAt: null,
            id: selectedCustomerId
          }
        })
      : null,
    customerQuery.length >= 2
      ? prisma.customer.findMany({
          orderBy: {
            updatedAt: "desc"
          },
          take: 8,
          where: {
            archivedAt: null,
            OR: [
              { name: { contains: customerQuery, mode: "insensitive" as const } },
              { phone: { contains: customerQuery, mode: "insensitive" as const } }
            ]
          }
        })
      : [],
    prisma.sale.findMany({
      include: {
        customer: true,
        items: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 8
    }),
    prisma.sale.aggregate({
      _sum: {
        paidAmount: true,
        total: true
      }
    })
  ]);

  const unpaidBalance = asNumber(totals._sum.total) - asNumber(totals._sum.paidAmount);
  const billProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: asNumber(product.sellingPrice),
    unit: product.unit
  }));

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.42),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(34,211,238,0.24),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(168,85,247,0.18),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl shadow-black/20">
                    <CreditCard aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
                      Billing
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      Sales
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Create inventory sales, collect payments, and let TailorTrack reduce stock
                  automatically.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
                {[
                  {
                    icon: ReceiptText,
                    label: "Invoices",
                    value: recentSales.length
                  },
                  {
                    icon: Banknote,
                    label: "Total sales",
                    value: formatCurrency(totals._sum.total)
                  },
                  {
                    icon: CheckCircle2,
                    label: "Paid",
                    value: formatCurrency(totals._sum.paidAmount)
                  },
                  {
                    icon: FileText,
                    label: "Unpaid",
                    value: formatCurrency(unpaidBalance)
                  }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white shadow-sm backdrop-blur"
                      key={stat.label}
                    >
                      <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-sky-300/15 text-sky-100">
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

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-sm backdrop-blur">
            <div className="border-b border-slate-100 bg-gradient-to-br from-white to-sky-50/60 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <ShoppingBag aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Create inventory sale</h2>
                  <p className="text-sm text-slate-500">
                    Add inventory, stitching service, or both to one invoice.
                  </p>
                </div>
              </div>
            </div>

            <form action={createInventorySale} className="grid gap-4 p-5 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                      <UserRound aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Customer</p>
                      <p className="text-xs text-slate-500">
                        Search by name or phone, or keep this sale as walk-in.
                      </p>
                    </div>
                  </div>
                  {selectedCustomer ? (
                    <Link
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-sky-50 hover:text-sky-700"
                      href="/sales"
                    >
                      Use walk-in
                    </Link>
                  ) : (
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
                      Walk-in selected
                    </span>
                  )}
                </div>

                {selectedCustomer ? (
                  <div className="mt-4 rounded-2xl border border-sky-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {selectedCustomer.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{selectedCustomer.phone}</p>
                        {selectedCustomer.address ? (
                          <p className="mt-1 text-xs text-slate-500">{selectedCustomer.address}</p>
                        ) : null}
                      </div>
                      {selectedCustomer._count.measurements ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          Measurements available
                        </span>
                      ) : (
                        <Link
                          className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
                          href={`/measurements?q=${encodeURIComponent(selectedCustomer.phone)}` as Route}
                        >
                          Add measurements
                        </Link>
                      )}
                    </div>
                  </div>
                ) : null}

                <input name="customerId" type="hidden" value={selectedCustomer?.id ?? ""} />
              </div>

              <section className="rounded-3xl border border-sky-100 bg-sky-50/50 p-4 md:col-span-2">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                    <ShoppingBag aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Inventory item</h3>
                    <p className="text-xs text-slate-500">
                      Optional. Stock reduces only when an item and quantity are selected.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_14rem]">
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    Item
                    <select
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      name="productId"
                    >
                      <option value="">No inventory item</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {formatQuantity(product.quantityOnHand, product.unit)}{" "}
                          in stock - {formatCurrency(product.sellingPrice)} / {product.unit}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    Quantity sold
                    <input
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      min="0.01"
                      name="quantity"
                      placeholder="Qty"
                      step="0.01"
                      type="number"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-3xl border border-violet-100 bg-violet-50/50 p-4 md:col-span-2">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
                    <ReceiptText aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Stitching service</h3>
                    <p className="text-xs text-slate-500">
                      Optional. Requires a selected customer with measurements.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    Garment type
                    <input
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      name="garmentType"
                      placeholder="Shalwar kameez, suit, alteration"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    Stitching charge
                    <input
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      min="0"
                      name="stitchingCharge"
                      placeholder="0"
                      step="0.01"
                      type="number"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    Due date
                    <input
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      name="dueDate"
                      type="date"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    Style notes
                    <input
                      className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      name="styleNotes"
                      placeholder="Collar, cuffs, fitting notes"
                    />
                  </label>
                </div>
              </section>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Discount
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  min="0"
                  name="discount"
                  placeholder="0"
                  step="0.01"
                  type="number"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Paid amount
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  min="0"
                  name="paidAmount"
                  placeholder="0"
                  step="0.01"
                  type="number"
                />
                <span className="text-xs font-normal leading-5 text-slate-500">
                  Walk-in sales must be fully paid. Select a customer to allow balance.
                </span>
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Payment method
                <select
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  name="paymentMethod"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>

              <BillTotalPreview products={billProducts} />

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Note
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  name="note"
                  placeholder="Optional invoice note"
                />
              </label>

              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-6 text-sky-900 md:col-span-2">
                Create inventory-only, stitching-only, or combined invoices. Inventory stock is
                reduced only for the inventory line; stitching creates a stitching order.
              </div>

              <button className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 md:col-span-2">
                Create sale
              </button>
            </form>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <Search aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Find customer</h2>
                  <p className="text-xs text-slate-500">Search active customers only</p>
                </div>
              </div>

              <form action="/sales" className="mt-4 grid gap-3">
                <input
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  defaultValue={customerQuery}
                  name="customerQuery"
                  placeholder="Name or phone"
                />
                <button className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm">
                  Search customer
                </button>
              </form>

              <div className="mt-4 space-y-2">
                {customerQuery && customerQuery.length < 2 ? (
                  <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                    Type at least 2 characters.
                  </p>
                ) : null}

                {customerMatches.map((customer) => {
                  const href = `/sales?${new URLSearchParams({
                    customerId: customer.id,
                    customerQuery
                  }).toString()}` as Route;

                  return (
                    <Link
                      className={`block rounded-2xl border p-3 transition ${
                        selectedCustomer?.id === customer.id
                          ? "border-sky-200 bg-sky-50"
                          : "border-slate-100 bg-white hover:border-sky-100 hover:bg-sky-50/60"
                      }`}
                      href={href}
                      key={customer.id}
                    >
                      <p className="text-sm font-semibold text-slate-950">{customer.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{customer.phone}</p>
                    </Link>
                  );
                })}

                {customerQuery.length >= 2 && !customerMatches.length ? (
                  <div className="rounded-2xl border border-slate-100 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-950">No customer found</p>
                    <Link
                      className="mt-2 inline-flex rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700"
                      href="/customers"
                    >
                      Add new customer
                    </Link>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <PackageCheck aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Inventory stock-out</h2>
                  <p className="text-xs text-slate-500">Automatic on sale save</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>Rolls reduce by meters sold.</p>
                <p>Boxes reduce by boxes sold.</p>
                <p>Readymade reduces by pieces sold.</p>
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Users aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Recent sales</h2>
                  <p className="text-xs text-slate-500">Latest invoices</p>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {recentSales.length ? (
                  recentSales.map((sale) => (
                    <Link
                      className="block py-3 transition hover:bg-sky-50/50"
                      href={`/sales/${sale.id}`}
                      key={sale.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {sale.invoiceNumber}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {sale.customer?.name ?? "Walk-in"} - {sale.items.length} item
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-950">
                          {formatCurrency(sale.total)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-sky-700">Open invoice</p>
                    </Link>
                  ))
                ) : (
                  <p className="py-3 text-sm text-slate-500">No sales yet.</p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
