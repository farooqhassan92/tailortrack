import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  Phone,
  ReceiptText,
  Ruler,
  Scissors,
  UserRound
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentOrganization } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

import { StatementPrintButton } from "./statement-print-button";

export const dynamic = "force-dynamic";

type DecimalLike = {
  toNumber: () => number;
};

type CustomerTab = "overview" | "invoices" | "orders" | "payments" | "measurements";

const measurementFields = [
  { key: "shirtLength", label: "Shirt length" },
  { key: "shoulder", label: "Shoulder" },
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "sleeve", label: "Sleeve" },
  { key: "collar", label: "Collar" },
  { key: "trouserLength", label: "Trouser length" },
  { key: "trouserWaist", label: "Trouser waist" },
  { key: "inseam", label: "Inseam" }
] as const;

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

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function formatMeasurement(value: DecimalLike | number | null | undefined) {
  if (!value) {
    return "-";
  }

  return `${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 2
  }).format(asNumber(value))}"`;
}

function getSelectedTab(value: string | string[] | undefined): CustomerTab {
  const selectedValue = Array.isArray(value) ? value[0] : value;

  if (
    selectedValue === "invoices" ||
    selectedValue === "orders" ||
    selectedValue === "payments" ||
    selectedValue === "measurements"
  ) {
    return selectedValue;
  }

  return "overview";
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

function orderTone(status: string) {
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

export default async function CustomerDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ customerId: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const organization = await getCurrentOrganization();
  const organizationId = organization.id;
  const [{ customerId }, queryParams] = await Promise.all([params, searchParams]);
  const selectedTab = getSelectedTab(queryParams?.tab);
  const customer = await prisma.customer.findUnique({
    include: {
      measurements: {
        orderBy: {
          updatedAt: "desc"
        }
      },
      sales: {
        include: {
          items: true,
          payments: {
            orderBy: {
              createdAt: "desc"
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      stitchingOrders: {
        include: {
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
        ]
      }
    },
    where: {
      id: customerId,
      organizationId
    }
  });

  if (!customer) {
    notFound();
  }

  const totalSales = customer.sales.reduce((sum, sale) => sum + asNumber(sale.total), 0);
  const totalPaid = customer.sales.reduce((sum, sale) => sum + asNumber(sale.paidAmount), 0);
  const balance = totalSales - totalPaid;
  const openInvoices = customer.sales.filter((sale) => asNumber(sale.total) > asNumber(sale.paidAmount));
  const payments = customer.sales
    .flatMap((sale) =>
      sale.payments.map((payment) => ({
        ...payment,
        invoiceNumber: sale.invoiceNumber,
        saleId: sale.id
      }))
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const activeOrders = customer.stitchingOrders.filter((order) =>
    ["PENDING", "CUTTING", "STITCHING", "READY"].includes(order.status)
  );
  const deliveredOrders = customer.stitchingOrders.filter((order) => order.status === "DELIVERED");
  const lastPayment = payments[0];
  const tabs: Array<{ icon: typeof UserRound; label: string; tab: CustomerTab; value: number }> = [
    { icon: UserRound, label: "Overview", tab: "overview", value: customer.sales.length },
    { icon: ReceiptText, label: "Invoices", tab: "invoices", value: customer.sales.length },
    { icon: Scissors, label: "Orders", tab: "orders", value: customer.stitchingOrders.length },
    { icon: CreditCard, label: "Payments", tab: "payments", value: payments.length },
    { icon: Ruler, label: "Measurements", tab: "measurements", value: customer.measurements.length }
  ];

  return (
    <AppShell>
      <section className="print-statement hidden">
        <div className="receipt-brand">
          <div>
            <p className="receipt-shop-name">{organization.name}</p>
            {[organization.address, organization.city].filter(Boolean).length ? (
              <p>{[organization.address, organization.city].filter(Boolean).join(", ")}</p>
            ) : null}
            {organization.phone ? <p>{organization.phone}</p> : null}
          </div>
          <div className="receipt-brand-mark">Statement</div>
        </div>

        <div className="receipt-header">
          <div>
            <p className="receipt-label">Customer Statement</p>
            <h1>{customer.name}</h1>
          </div>
          <div className="receipt-meta">
            <p>{customer.phone}</p>
            <p>{formatDateTime(new Date())}</p>
          </div>
        </div>

        <div className="receipt-grid">
          <section>
            <h2>Customer Info</h2>
            <p className="receipt-strong">{customer.name}</p>
            <p>{customer.phone}</p>
            {customer.address ? <p>{customer.address}</p> : null}
          </section>
          <section>
            <h2>Account Summary</h2>
            <p>Total sales: {formatCurrency(totalSales)}</p>
            <p>Total paid: {formatCurrency(totalPaid)}</p>
            <p>Balance: {formatCurrency(balance)}</p>
          </section>
        </div>

        <section>
          <h2>Invoices</h2>
          <table className="receipt-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customer.sales.map((sale) => {
                const saleBalance = asNumber(sale.total) - asNumber(sale.paidAmount);

                return (
                  <tr key={sale.id}>
                    <td>{sale.invoiceNumber}</td>
                    <td>{formatDate(sale.createdAt)}</td>
                    <td>{formatCurrency(sale.total)}</td>
                    <td>{formatCurrency(sale.paidAmount)}</td>
                    <td>{formatCurrency(saleBalance)}</td>
                    <td>{sale.paymentStatus}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <footer className="receipt-footer">
          {organization.invoiceFooter || "Thank you for your business."}
        </footer>
      </section>

      <div className="no-print space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.34),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(14,165,233,0.24),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(16,185,129,0.14),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Link
                  className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                  href={"/customers" as Route}
                >
                  <ArrowLeft aria-hidden="true" className="size-3.5" />
                  Customers
                </Link>
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl shadow-black/20">
                    <UserRound aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                      Customer ledger
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      {customer.name}
                    </h1>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                  <span className="inline-flex items-center gap-2">
                    <Phone aria-hidden="true" className="size-4" />
                    {customer.phone}
                  </span>
                  {customer.address ? <span>{customer.address}</span> : null}
                </div>
                <div className="mt-5">
                  <StatementPrintButton />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[38rem]">
                {[
                  { icon: Banknote, label: "Sales", value: formatCurrency(totalSales) },
                  { icon: CheckCircle2, label: "Paid", value: formatCurrency(totalPaid) },
                  { icon: FileText, label: "Balance", value: formatCurrency(balance) },
                  { icon: ClipboardList, label: "Open invoices", value: openInvoices.length }
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
                <h2 className="text-lg font-semibold text-slate-950">Customer details</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review account balance, orders, payments, and measurements.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {tabs.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                        selectedTab === item.tab
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                      href={`/customers/${customer.id}?tab=${item.tab}` as Route}
                      key={item.tab}
                    >
                      <Icon aria-hidden="true" className="size-3.5" />
                      {item.label} ({item.value})
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedTab === "overview" ? (
            <Overview
              activeOrders={activeOrders.length}
              balance={balance}
              deliveredOrders={deliveredOrders.length}
              lastPaymentDate={lastPayment?.createdAt}
              notes={customer.notes}
              openInvoices={openInvoices.length}
              totalPaid={totalPaid}
              totalSales={totalSales}
            />
          ) : null}

          {selectedTab === "invoices" ? <InvoiceTable sales={customer.sales} /> : null}

          {selectedTab === "orders" ? <OrderTable orders={customer.stitchingOrders} /> : null}

          {selectedTab === "payments" ? <PaymentTable payments={payments} /> : null}

          {selectedTab === "measurements" ? (
            <MeasurementList measurements={customer.measurements} />
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function Overview({
  activeOrders,
  balance,
  deliveredOrders,
  lastPaymentDate,
  notes,
  openInvoices,
  totalPaid,
  totalSales
}: {
  activeOrders: number;
  balance: number;
  deliveredOrders: number;
  lastPaymentDate?: Date;
  notes: string | null;
  openInvoices: number;
  totalPaid: number;
  totalSales: number;
}) {
  return (
    <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Total sales", value: formatCurrency(totalSales) },
          { label: "Total paid", value: formatCurrency(totalPaid) },
          { label: "Balance due", value: formatCurrency(balance) },
          { label: "Open invoices", value: openInvoices },
          { label: "Active orders", value: activeOrders },
          { label: "Delivered orders", value: deliveredOrders }
        ].map((item) => (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4" key={item.label}>
            <p className="text-xs font-medium text-slate-400">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>

      <aside className="rounded-2xl border border-slate-100 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">Account note</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{notes || "No notes saved."}</p>
        <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          Last payment: {lastPaymentDate ? formatDate(lastPaymentDate) : "No payment yet"}
        </div>
      </aside>
    </div>
  );
}

function InvoiceTable({
  sales
}: {
  sales: Array<{
    createdAt: Date;
    id: string;
    invoiceNumber: string;
    items: Array<{ id: string }>;
    paidAmount: DecimalLike;
    paymentStatus: string;
    total: DecimalLike;
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-5 py-3 font-semibold">Invoice</th>
            <th className="px-5 py-3 font-semibold">Date</th>
            <th className="px-5 py-3 font-semibold">Items</th>
            <th className="px-5 py-3 text-right font-semibold">Total</th>
            <th className="px-5 py-3 text-right font-semibold">Paid</th>
            <th className="px-5 py-3 text-right font-semibold">Balance</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {sales.length ? (
            sales.map((sale) => {
              const balance = asNumber(sale.total) - asNumber(sale.paidAmount);

              return (
                <tr className="transition hover:bg-slate-50" key={sale.id}>
                  <td className="px-5 py-4 font-semibold text-slate-950">{sale.invoiceNumber}</td>
                  <td className="px-5 py-4 text-slate-600">{formatDate(sale.createdAt)}</td>
                  <td className="px-5 py-4 text-slate-600">{sale.items.length}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-950">
                    {formatCurrency(sale.total)}
                  </td>
                  <td className="px-5 py-4 text-right text-slate-600">
                    {formatCurrency(sale.paidAmount)}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-950">
                    {formatCurrency(balance)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${paymentTone(sale.paymentStatus)}`}
                    >
                      {sale.paymentStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      className="inline-flex rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
                      href={`/sales/${sale.id}` as Route}
                    >
                      {balance > 0 ? "Settle" : "Open"}
                    </Link>
                  </td>
                </tr>
              );
            })
          ) : (
            <EmptyTable colSpan={8} text="No invoices for this customer yet." />
          )}
        </tbody>
      </table>
    </div>
  );
}

function OrderTable({
  orders
}: {
  orders: Array<{
    dueDate: Date | null;
    garmentType: string;
    id: string;
    orderNumber: string;
    saleItems: Array<{ sale: { id: string; invoiceNumber: string } }>;
    status: string;
    stitchingCharge: DecimalLike;
    tailor: { name: string } | null;
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-5 py-3 font-semibold">Order</th>
            <th className="px-5 py-3 font-semibold">Garment</th>
            <th className="px-5 py-3 font-semibold">Due</th>
            <th className="px-5 py-3 font-semibold">Tailor</th>
            <th className="px-5 py-3 text-right font-semibold">Charge</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 text-right font-semibold">Invoice</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {orders.length ? (
            orders.map((order) => {
              const invoice = order.saleItems[0]?.sale;

              return (
                <tr className="transition hover:bg-slate-50" key={order.id}>
                  <td className="px-5 py-4 font-semibold text-slate-950">{order.orderNumber}</td>
                  <td className="px-5 py-4 text-slate-600">{order.garmentType}</td>
                  <td className="px-5 py-4 text-slate-600">{formatDate(order.dueDate)}</td>
                  <td className="px-5 py-4 text-slate-600">
                    {order.tailor?.name ?? "Not assigned"}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-950">
                    {formatCurrency(order.stitchingCharge)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${orderTone(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {invoice ? (
                      <Link
                        className="text-xs font-semibold text-slate-950 hover:text-slate-700"
                        href={`/sales/${invoice.id}` as Route}
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">No invoice</span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <EmptyTable colSpan={7} text="No stitching orders for this customer yet." />
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaymentTable({
  payments
}: {
  payments: Array<{
    amount: DecimalLike;
    createdAt: Date;
    id: string;
    invoiceNumber: string;
    method: string;
    note: string | null;
    saleId: string;
  }>;
}) {
  return (
    <div className="divide-y divide-slate-100">
      {payments.length ? (
        payments.map((payment) => (
          <div className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_8rem]" key={payment.id}>
            <div>
              <Link
                className="text-sm font-semibold text-slate-950 hover:text-slate-700"
                href={`/sales/${payment.saleId}` as Route}
              >
                {payment.invoiceNumber}
              </Link>
              <p className="mt-1 text-xs text-slate-500">
                {payment.note || "No payment note"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Method</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {payment.method.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Date</p>
              <p className="mt-1 text-sm text-slate-600">{formatDate(payment.createdAt)}</p>
            </div>
            <div className="lg:text-right">
              <p className="text-xs font-medium text-slate-400">Amount</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">
                {formatCurrency(payment.amount)}
              </p>
            </div>
          </div>
        ))
      ) : (
        <div className="p-10 text-center text-sm text-slate-500">No payments recorded yet.</div>
      )}
    </div>
  );
}

function MeasurementList({
  measurements
}: {
  measurements: Array<
    {
      id: string;
      label: string;
      styleNotes: string | null;
      updatedAt: Date;
    } & Record<(typeof measurementFields)[number]["key"], DecimalLike | null>
  >;
}) {
  return (
    <div className="grid gap-4 p-5 lg:grid-cols-2">
      {measurements.length ? (
        measurements.map((measurement) => (
          <article className="rounded-2xl border border-slate-100 bg-white p-4" key={measurement.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">{measurement.label}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Updated {formatDate(measurement.updatedAt)}
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                Inches
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {measurementFields.map((field) => (
                <div className="rounded-xl bg-slate-50 px-3 py-2" key={field.key}>
                  <p className="text-xs text-slate-400">{field.label}</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {formatMeasurement(measurement[field.key])}
                  </p>
                </div>
              ))}
            </div>
            {measurement.styleNotes ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-slate-600">
                {measurement.styleNotes}
              </p>
            ) : null}
          </article>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500 lg:col-span-2">
          No measurement profiles saved for this customer.
        </div>
      )}
    </div>
  );
}

function EmptyTable({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td className="px-5 py-10 text-center text-slate-500" colSpan={colSpan}>
        {text}
      </td>
    </tr>
  );
}
