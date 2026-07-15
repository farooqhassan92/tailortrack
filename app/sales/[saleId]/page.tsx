import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  PackageCheck,
  Plus,
  ReceiptText,
  Scissors,
  UserRound
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { prisma } from "@/lib/prisma";

import { addInvoicePayment } from "../actions";
import { InvoicePrintButton } from "./invoice-print-button";

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

function formatQuantity(value: DecimalLike | number | null | undefined, unit?: string | null) {
  return `${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 2
  }).format(asNumber(value))}${unit ? ` ${unit}` : ""}`;
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium"
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function paymentTone(status: string) {
  if (status === "PAID") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (status === "PARTIAL") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-rose-100 bg-rose-50 text-rose-700";
}

const paymentMessages = {
  added: {
    text: "Payment recorded and invoice balance updated.",
    variant: "success"
  },
  invalid: {
    text: "Enter a valid payment amount before saving.",
    variant: "warning"
  },
  "not-found": {
    text: "Invoice was not found.",
    variant: "error"
  },
  "no-balance": {
    text: "This invoice has no remaining balance to settle.",
    variant: "info"
  }
} as const;

export default async function SaleDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ saleId: string }>;
  searchParams?: Promise<{ payment?: string | string[]; print?: string | string[] }>;
}) {
  const { saleId } = await params;
  const query = await searchParams;
  const printValue = Array.isArray(query?.print) ? query?.print[0] : query?.print;
  const paymentValue = Array.isArray(query?.payment) ? query?.payment[0] : query?.payment;
  const shouldAutoPrint = printValue === "1";
  const sale = await prisma.sale.findUnique({
    include: {
      customer: true,
      items: {
        include: {
          product: true,
          stitchingOrder: {
            include: {
              tailor: true
            }
          }
        },
        orderBy: {
          id: "asc"
        }
      },
      payments: {
        orderBy: {
          createdAt: "desc"
        }
      }
    },
    where: {
      id: saleId
    }
  });

  if (!sale) {
    notFound();
  }

  const balance = asNumber(sale.total) - asNumber(sale.paidAmount);
  const inventoryItems = sale.items.filter((item) => item.productId);
  const stitchingItems = sale.items.filter((item) => item.stitchingOrderId);
  const paymentMessage = getStatusMessage(paymentMessages, paymentValue);

  return (
    <AppShell>
      <section className="print-receipt hidden">
        <div className="receipt-header">
          <div>
            <p className="receipt-label">Invoice</p>
            <h1>{sale.invoiceNumber}</h1>
          </div>
          <div className="receipt-meta">
            <p>{formatDateTime(sale.createdAt)}</p>
            <p>Status: {sale.paymentStatus}</p>
          </div>
        </div>

        <div className="receipt-grid">
          <section>
            <h2>Customer Info</h2>
            <p className="receipt-strong">{sale.customer?.name ?? "Walk-in customer"}</p>
            {sale.customer ? (
              <>
                <p>{sale.customer.phone}</p>
                {sale.customer.address ? <p>{sale.customer.address}</p> : null}
              </>
            ) : (
              <p>No customer record attached.</p>
            )}
          </section>

          <section>
            <h2>Order Info</h2>
            <p>Items: {sale.items.length}</p>
            <p>Inventory: {inventoryItems.length}</p>
            <p>Stitching: {stitchingItems.length}</p>
          </section>
        </div>

        <section>
          <h2>Order Items</h2>
          <table className="receipt-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => {
                const unit = item.product?.unit ?? "service";

                return (
                  <tr key={item.id}>
                    <td>
                      <p className="receipt-strong">{item.description}</p>
                      {item.product?.sku ? <p>SKU {item.product.sku}</p> : null}
                      {item.stitchingOrder ? (
                        <p>Order {item.stitchingOrder.orderNumber}</p>
                      ) : null}
                    </td>
                    <td>{item.stitchingOrderId ? "Stitching" : "Inventory"}</td>
                    <td>{formatQuantity(item.quantity, item.productId ? unit : null)}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {stitchingItems.length ? (
          <section>
            <h2>Stitching Details</h2>
            <div className="receipt-list">
              {stitchingItems.map((item) => {
                const order = item.stitchingOrder;

                if (!order) {
                  return null;
                }

                return (
                  <div className="receipt-list-row" key={item.id}>
                    <p className="receipt-strong">{order.orderNumber}</p>
                    <p>{order.garmentType}</p>
                    <p>Due: {formatDate(order.dueDate)}</p>
                    <p>Charge: {formatCurrency(order.stitchingCharge)}</p>
                    {order.styleNotes ? <p>Notes: {order.styleNotes}</p> : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="receipt-summary">
          <div>
            <span>Subtotal</span>
            <strong>{formatCurrency(sale.subtotal)}</strong>
          </div>
          <div>
            <span>Discount</span>
            <strong>- {formatCurrency(sale.discount)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatCurrency(sale.total)}</strong>
          </div>
          <div>
            <span>Paid</span>
            <strong>{formatCurrency(sale.paidAmount)}</strong>
          </div>
          <div className="receipt-balance">
            <span>Balance</span>
            <strong>{formatCurrency(balance)}</strong>
          </div>
        </section>

        {sale.payments.length ? (
          <section>
            <h2>Payments</h2>
            <div className="receipt-list">
              {sale.payments.map((payment) => (
                <div className="receipt-list-row" key={payment.id}>
                  <p>
                    <span className="receipt-strong">{payment.method.replace("_", " ")}</span>{" "}
                    - {formatCurrency(payment.amount)}
                  </p>
                  <p>{formatDateTime(payment.createdAt)}</p>
                  {payment.note ? <p>{payment.note}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </section>

      <div className="no-print space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10 print:rounded-none print:border-0 print:bg-white print:shadow-none">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.38),transparent_22rem),radial-gradient(circle_at_86%_12%,rgba(14,165,233,0.25),transparent_20rem),radial-gradient(circle_at_60%_96%,rgba(168,85,247,0.16),transparent_18rem)] print:hidden" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Link
                  className="no-print mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/15"
                  href="/sales"
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Back to sales
                </Link>
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl shadow-black/20 print:border print:border-slate-200 print:shadow-none">
                    <ReceiptText aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200 print:text-slate-500">
                      Invoice detail
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white print:text-slate-950 sm:text-4xl">
                      {sale.invoiceNumber}
                    </h1>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-300 print:text-slate-600 sm:text-base">
                  Created {formatDateTime(sale.createdAt)}
                </p>
                <div className="no-print mt-5">
                  <InvoicePrintButton autoPrint={shouldAutoPrint} />
                </div>
              </div>

              <div className="no-print grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
                {[
                  {
                    icon: Banknote,
                    label: "Total",
                    value: formatCurrency(sale.total)
                  },
                  {
                    icon: CheckCircle2,
                    label: "Paid",
                    value: formatCurrency(sale.paidAmount)
                  },
                  {
                    icon: FileText,
                    label: "Balance",
                    value: formatCurrency(balance)
                  },
                  {
                    icon: CreditCard,
                    label: "Status",
                    value: sale.paymentStatus
                  }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white shadow-sm backdrop-blur"
                      key={stat.label}
                    >
                      <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-100">
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

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/85 shadow-sm backdrop-blur">
              <div className="border-b border-slate-100 bg-gradient-to-br from-white to-emerald-50/60 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <PackageCheck aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Invoice lines</h2>
                    <p className="text-sm text-slate-500">
                      Inventory and stitching charges included in this invoice.
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50/70 text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Item</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold">Qty</th>
                      <th className="px-5 py-3 font-semibold">Rate</th>
                      <th className="px-5 py-3 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {sale.items.map((item) => {
                      const unit = item.product?.unit ?? "service";

                      return (
                        <tr key={item.id}>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-950">{item.description}</p>
                            {item.product?.sku ? (
                              <p className="mt-1 text-xs text-slate-500">SKU {item.product.sku}</p>
                            ) : null}
                            {item.stitchingOrder ? (
                              <p className="mt-1 text-xs text-violet-600">
                                Order {item.stitchingOrder.orderNumber}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {item.stitchingOrderId ? "Stitching" : "Inventory"}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {formatQuantity(item.quantity, item.productId ? unit : null)}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-slate-950">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {stitchingItems.length ? (
              <section className="rounded-3xl border border-violet-100 bg-violet-50/50 p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
                    <Scissors aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Stitching orders</h2>
                    <p className="text-sm text-slate-500">Order details created from this sale.</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {stitchingItems.map((item) => {
                    const order = item.stitchingOrder;

                    if (!order) {
                      return null;
                    }

                    return (
                      <div className="rounded-2xl border border-white bg-white/85 p-4" key={item.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {order.orderNumber}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{order.garmentType}</p>
                          </div>
                          <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                            {order.status}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-2 text-sm text-slate-600">
                          <p>Due date: {formatDate(order.dueDate)}</p>
                          <p>Tailor: {order.tailor?.name ?? "Not assigned"}</p>
                          <p>Charge: {formatCurrency(order.stitchingCharge)}</p>
                          {order.styleNotes ? <p>Notes: {order.styleNotes}</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <UserRound aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Customer</h2>
                  <p className="text-xs text-slate-500">Invoice owner</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">
                  {sale.customer?.name ?? "Walk-in customer"}
                </p>
                {sale.customer ? (
                  <>
                    <p className="mt-1 text-sm text-slate-500">{sale.customer.phone}</p>
                    {sale.customer.address ? (
                      <p className="mt-1 text-sm text-slate-500">{sale.customer.address}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">No customer record attached.</p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ReceiptText aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Bill summary</h2>
                  <p className="text-xs text-slate-500">Final calculation</p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3 text-slate-600">
                  <span>Inventory</span>
                  <span>{formatCurrency(inventoryItems.reduce((sum, item) => sum + asNumber(item.total), 0))}</span>
                </div>
                <div className="flex justify-between gap-3 text-slate-600">
                  <span>Stitching</span>
                  <span>{formatCurrency(stitchingItems.reduce((sum, item) => sum + asNumber(item.total), 0))}</span>
                </div>
                <div className="flex justify-between gap-3 text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>
                <div className="flex justify-between gap-3 text-slate-600">
                  <span>Discount</span>
                  <span>- {formatCurrency(sale.discount)}</span>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex justify-between gap-3 text-base font-semibold text-slate-950">
                    <span>Total</span>
                    <span>{formatCurrency(sale.total)}</span>
                  </div>
                </div>
                <div className="flex justify-between gap-3 text-slate-600">
                  <span>Paid</span>
                  <span>{formatCurrency(sale.paidAmount)}</span>
                </div>
                <div className="flex justify-between gap-3 text-slate-950">
                  <span>Balance</span>
                  <span className="font-semibold">{formatCurrency(balance)}</span>
                </div>
              </div>

              <div className={`mt-4 rounded-2xl border px-3 py-2 text-center text-xs font-semibold ${paymentTone(sale.paymentStatus)}`}>
                {sale.paymentStatus}
              </div>
            </section>

            <StatusAlert message={paymentMessage} />

            {balance > 0 ? (
              <section className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Plus aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">Add payment</h2>
                    <p className="text-xs text-slate-500">
                      Remaining balance {formatCurrency(balance)}
                    </p>
                  </div>
                </div>

                <form action={addInvoicePayment} className="mt-4 grid gap-3">
                  <input name="saleId" type="hidden" value={sale.id} />
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    Amount received
                    <input
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      max={balance}
                      min="0.01"
                      name="amount"
                      placeholder={formatCurrency(balance)}
                      required
                      step="0.01"
                      type="number"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                    Payment method
                    <select
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
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
                      className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                      name="note"
                      placeholder="Optional payment note"
                    />
                  </label>
                  <button className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm">
                    Save payment
                  </button>
                </form>
              </section>
            ) : null}

            <section className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <CalendarDays aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Payments</h2>
                  <p className="text-xs text-slate-500">Collected against invoice</p>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {sale.payments.length ? (
                  sale.payments.map((payment) => (
                    <div className="py-3" key={payment.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            {payment.method.replace("_", " ")}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(payment.createdAt)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-950">
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                      {payment.note ? (
                        <p className="mt-2 text-xs text-slate-500">{payment.note}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="py-3 text-sm text-slate-500">No payment recorded.</p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
