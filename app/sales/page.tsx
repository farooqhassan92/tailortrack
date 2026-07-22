import Link from "next/link";
import type { Route } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { getCurrentOrganizationId } from "@/lib/organization";
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
  Users
} from "lucide-react";

import { GuidedSaleForm } from "./guided-sale-form";

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
  const organizationId = await getCurrentOrganizationId();
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
        organizationId,
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
            id: selectedCustomerId,
            organizationId
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
            organizationId,
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
      take: 8,
      where: {
        organizationId
      }
    }),
    prisma.sale.aggregate({
      _sum: {
        paidAmount: true,
        total: true
      },
      where: {
        organizationId
      }
    })
  ]);

  const unpaidBalance = asNumber(totals._sum.total) - asNumber(totals._sum.paidAmount);
  const billProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: asNumber(product.sellingPrice),
    quantityOnHand: asNumber(product.quantityOnHand),
    unit: product.unit
  }));
  const guidedCustomer = selectedCustomer
    ? {
        address: selectedCustomer.address,
        id: selectedCustomer.id,
        measurementCount: selectedCustomer._count.measurements,
        name: selectedCustomer.name,
        phone: selectedCustomer.phone
      }
    : null;

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
                    Follow the guided flow to create inventory, stitching, or combined invoices.
                  </p>
                </div>
              </div>
            </div>

            <GuidedSaleForm products={billProducts} selectedCustomer={guidedCustomer} />
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
                <PendingSubmitButton
                  className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  pendingText="Searching..."
                >
                  Search customer
                </PendingSubmitButton>
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
