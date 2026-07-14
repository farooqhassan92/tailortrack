import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Users
} from "lucide-react";

import { createInventorySale } from "./actions";

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
    tone: "border-emerald-100 bg-emerald-50 text-emerald-800",
    text: "Sale created and inventory stock was reduced automatically."
  },
  missing: {
    tone: "border-amber-100 bg-amber-50 text-amber-800",
    text: "Select an item and enter a quantity before creating a sale."
  },
  "invalid-product": {
    tone: "border-rose-100 bg-rose-50 text-rose-800",
    text: "That inventory item is not available for sale."
  },
  "insufficient-stock": {
    tone: "border-rose-100 bg-rose-50 text-rose-800",
    text: "Not enough stock is available for that sale quantity."
  }
} as const;

export default async function SalesPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string | string[] }>;
}) {
  const params = await searchParams;
  const status = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const statusMessage = status && status in statusMessages
    ? statusMessages[status as keyof typeof statusMessages]
    : null;

  const [products, customers, recentSales, totals] = await Promise.all([
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
    prisma.customer.findMany({
      orderBy: {
        name: "asc"
      },
      take: 100
    }),
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

        {statusMessage ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${statusMessage.tone}`}>
            {statusMessage.text}
          </div>
        ) : null}

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
                    Sale price comes from the selected inventory item.
                  </p>
                </div>
              </div>
            </div>

            <form action={createInventorySale} className="grid gap-4 p-5 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700 md:col-span-2">
                Inventory item
                <select
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  name="productId"
                  required
                >
                  <option value="">Select item</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatQuantity(product.quantityOnHand, product.unit)} in
                      stock - {formatCurrency(product.sellingPrice)} / {product.unit}
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
                  placeholder="Meters, boxes, or pieces"
                  required
                  step="0.01"
                  type="number"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Customer
                <select
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  name="customerId"
                >
                  <option value="">Walk-in customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </label>

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

              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                Note
                <input
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                  name="note"
                  placeholder="Optional invoice note"
                />
              </label>

              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-6 text-sky-900 md:col-span-2">
                When the sale is saved, inventory is reduced automatically and a stock-out movement
                is created with the invoice number.
              </div>

              <button className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 md:col-span-2">
                Create sale
              </button>
            </form>
          </div>

          <aside className="space-y-5">
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
                    <div className="py-3" key={sale.id}>
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
                    </div>
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
