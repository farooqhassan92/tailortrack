import Link from "next/link";
import type { Route } from "next";
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Boxes,
  Clock3,
  CreditCard,
  FileText,
  PackageCheck,
  ReceiptText,
  Scissors,
  WalletCards
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  asNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatQuantity,
  getDashboardReport,
  getSelectedPeriod,
  periodOptions
} from "@/lib/dashboard-report";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ period?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedPeriod = getSelectedPeriod(params?.period);
  const report = await getDashboardReport(selectedPeriod);
  const reportHref = `/dashboard/report?period=${selectedPeriod}` as Route;
  const pdfHref = `/dashboard/report?period=${selectedPeriod}&print=1` as Route;

  const salesStats = [
    {
      label: `${report.selectedPeriodLabel} Sales`,
      value: formatCurrency(report.totalSales),
      icon: Banknote,
      accent: "from-teal-500 to-emerald-500"
    },
    {
      label: `${report.selectedPeriodLabel} Paid`,
      value: formatCurrency(report.paidSales),
      icon: CreditCard,
      accent: "from-sky-500 to-cyan-500"
    },
    {
      label: `${report.selectedPeriodLabel} Bills`,
      value: report.saleCount.toString(),
      icon: ReceiptText,
      accent: "from-violet-500 to-fuchsia-500"
    },
    {
      label: `${report.selectedPeriodLabel} Unpaid`,
      value: formatCurrency(report.unpaidBalance),
      icon: Clock3,
      accent: "from-amber-500 to-orange-500"
    }
  ];

  const stitchingStats = [
    {
      label: `${report.selectedPeriodLabel} Orders`,
      value: report.stitchingCount.toString(),
      icon: Scissors,
      accent: "from-slate-700 to-slate-950"
    },
    {
      label: `${report.selectedPeriodLabel} Pending`,
      value: report.pendingStitching.toString(),
      icon: Clock3,
      accent: "from-rose-500 to-pink-500"
    },
    {
      label: `${report.selectedPeriodLabel} Ready`,
      value: report.readyOrders.toString(),
      icon: PackageCheck,
      accent: "from-indigo-500 to-blue-500"
    },
    {
      label: `${report.selectedPeriodLabel} Delivered`,
      value: report.deliveredOrders.toString(),
      icon: BadgeCheck,
      accent: "from-lime-500 to-teal-500"
    }
  ];
  const profitStats = [
    {
      label: `${report.selectedPeriodLabel} Net Profit`,
      value: formatCurrency(report.netProfit),
      icon: Banknote,
      accent: "from-emerald-600 to-teal-500"
    },
    {
      label: `${report.selectedPeriodLabel} Expenses`,
      value: formatCurrency(report.expenseTotal),
      icon: WalletCards,
      accent: "from-rose-500 to-pink-500"
    },
    {
      label: `${report.selectedPeriodLabel} Inventory Cost`,
      value: formatCurrency(report.inventoryCost),
      icon: Boxes,
      accent: "from-amber-500 to-yellow-500"
    },
    {
      label: `${report.selectedPeriodLabel} Salary Paid`,
      value: formatCurrency(report.salaryPaidTotal),
      icon: Scissors,
      accent: "from-indigo-500 to-violet-500"
    }
  ];

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.45),transparent_23rem),radial-gradient(circle_at_82%_22%,rgba(244,114,182,0.28),transparent_20rem)]" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">
                  Live shop overview
                </p>
                <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  Dashboard
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Review sales, payments, stitching progress, and stock signals from one concise
                  report.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
                <p className="text-sm font-medium text-slate-300">Selected report</p>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-2xl font-semibold">{report.selectedPeriodLabel}</span>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-slate-950">
                    <ArrowUpRight aria-hidden="true" className="size-5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/70 p-2 shadow-sm backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto">
            {periodOptions.map((period) => (
              <Link
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  period.value === selectedPeriod
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                    : "text-slate-600 hover:bg-white hover:text-slate-950"
                }`}
                href={`/dashboard?period=${period.value}` as Route}
                key={period.value}
              >
                {period.label}
              </Link>
            ))}
          </div>
          <div className="flex gap-2 px-1 pb-1 lg:pb-0">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              href={reportHref}
            >
              <FileText aria-hidden="true" className="size-4" />
              Open report
            </Link>
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10"
              href={pdfHref}
            >
              <ReceiptText aria-hidden="true" className="size-4" />
              Open PDF
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {salesStats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur"
                key={stat.label}
              >
                <div
                  className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.accent} text-white shadow-lg shadow-slate-950/10`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stitchingStats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur"
                key={stat.label}
              >
                <div
                  className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.accent} text-white shadow-lg shadow-slate-950/10`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {profitStats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur"
                key={stat.label}
              >
                <div
                  className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.accent} text-white shadow-lg shadow-slate-950/10`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </div>
                <p className="mt-5 text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</p>
              </div>
            );
          })}
        </div>

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                  Complete report
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {report.selectedPeriodLabel} business detail
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(report.startDate)} to {formatDateTime(report.endDate)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Customers</p>
                  <p className="font-semibold text-slate-950">{report.activeCustomerCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Stock items</p>
                  <p className="font-semibold text-slate-950">{report.activeProductCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Net profit</p>
                  <p className="font-semibold text-slate-950">{formatCurrency(report.netProfit)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="text-xs text-slate-500">Expenses</p>
                  <p className="font-semibold text-slate-950">{formatCurrency(report.expenseTotal)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="border-b border-slate-100 xl:border-b-0 xl:border-r">
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <ReceiptText aria-hidden="true" className="size-5 text-sky-700" />
                <h3 className="font-semibold text-slate-950">Sales detail</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Invoice</th>
                      <th className="px-5 py-3 font-semibold">Customer</th>
                      <th className="px-5 py-3 font-semibold">Items</th>
                      <th className="px-5 py-3 text-right font-semibold">Total</th>
                      <th className="px-5 py-3 text-right font-semibold">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {report.recentSales.length ? (
                      report.recentSales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="px-5 py-4">
                            <Link
                              className="font-semibold text-slate-950 hover:text-sky-700"
                              href={`/sales/${sale.id}` as Route}
                            >
                              {sale.invoiceNumber}
                            </Link>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDateTime(sale.createdAt)}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {sale.customer?.name ?? "Walk-in"}
                          </td>
                          <td className="px-5 py-4 text-slate-600">
                            {sale.items.length} item{sale.items.length === 1 ? "" : "s"}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-slate-950">
                            {formatCurrency(sale.total)}
                          </td>
                          <td className="px-5 py-4 text-right text-slate-600">
                            {formatCurrency(asNumber(sale.total) - asNumber(sale.paidAmount))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-5 py-8 text-center text-slate-500" colSpan={5}>
                          No sales recorded for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="divide-y divide-slate-100">
              <section className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <Scissors aria-hidden="true" className="size-5 text-violet-700" />
                  <h3 className="font-semibold text-slate-950">Stitching work</h3>
                </div>
                <div className="space-y-3">
                  {report.stitchingOrders.length ? (
                    report.stitchingOrders.slice(0, 5).map((order) => (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3" key={order.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">
                              {order.orderNumber}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {order.customer.name} - {order.garmentType}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {order.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Due {formatDate(order.dueDate)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No stitching orders for this period.</p>
                  )}
                </div>
              </section>

              <section className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <WalletCards aria-hidden="true" className="size-5 text-rose-700" />
                  <h3 className="font-semibold text-slate-950">Recent expenses</h3>
                </div>
                <div className="space-y-2">
                  {report.recentExpenses.length ? (
                    report.recentExpenses.slice(0, 4).map((expense) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                        key={expense.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {expense.description}
                          </p>
                          <p className="text-xs text-slate-500">
                            {expense.category.replace("_", " ")} - {formatDate(expense.spentAt)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-700">
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No expenses recorded for this period.</p>
                  )}
                </div>
              </section>

              <section className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <Boxes aria-hidden="true" className="size-5 text-amber-700" />
                  <h3 className="font-semibold text-slate-950">Low stock</h3>
                </div>
                <div className="space-y-2">
                  {report.lowStockProducts.length ? (
                    report.lowStockProducts.map((product) => (
                      <div
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
                        key={product.id}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500">{product.category}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-slate-700">
                          {formatQuantity(product.quantityOnHand, product.unit)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No low-stock items found.</p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
