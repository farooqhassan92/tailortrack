import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";

import {
  asNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatQuantity,
  getDashboardReport,
  getSelectedPeriod
} from "@/lib/dashboard-report";
import { getCurrentOrganization } from "@/lib/organization";

import { ReportPrintButton } from "./report-print-button";

export const dynamic = "force-dynamic";

export default async function DashboardReportPage({
  searchParams
}: {
  searchParams?: Promise<{ period?: string | string[]; print?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedPeriod = getSelectedPeriod(params?.period);
  const printValue = Array.isArray(params?.print) ? params?.print[0] : params?.print;
  const report = await getDashboardReport(selectedPeriod);
  const organization = await getCurrentOrganization();
  const dashboardHref = `/dashboard?period=${selectedPeriod}` as Route;
  const shouldAutoPrint = printValue === "1";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 sm:px-6 lg:px-8 report-page">
      <div className="no-print mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
          href={dashboardHref}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to dashboard
        </Link>
        <ReportPrintButton autoPrint={shouldAutoPrint} />
      </div>

      <article className="report-document mx-auto max-w-5xl bg-white p-6 shadow-sm sm:p-8">
        <header className="report-document-header">
          <div>
            <p className="report-eyebrow">{organization.name}</p>
            <h1>{report.selectedPeriodLabel} Business Report</h1>
            <p>
              {formatDate(report.startDate)} to {formatDateTime(report.endDate)}
            </p>
            {[organization.address, organization.city, organization.phone].filter(Boolean).length ? (
              <p className="report-business-line">
                {[organization.address, organization.city, organization.phone]
                  .filter(Boolean)
                  .join(" | ")}
              </p>
            ) : null}
          </div>
          <div className="report-generated">
            <p>Generated</p>
            <strong>{formatDateTime(report.endDate)}</strong>
          </div>
        </header>

        <section className="report-summary">
          <div>
            <h2>Financial Summary</h2>
            <dl>
              <div>
                <dt>Total sales</dt>
                <dd>{formatCurrency(report.totalSales)}</dd>
              </div>
              <div>
                <dt>Paid amount</dt>
                <dd>{formatCurrency(report.paidSales)}</dd>
              </div>
              <div>
                <dt>Outstanding balance</dt>
                <dd>{formatCurrency(report.unpaidBalance)}</dd>
              </div>
              <div>
                <dt>Inventory cost</dt>
                <dd>{formatCurrency(report.inventoryCost)}</dd>
              </div>
              <div>
                <dt>Salary paid</dt>
                <dd>{formatCurrency(report.salaryPaidTotal)}</dd>
              </div>
              <div>
                <dt>Expenses</dt>
                <dd>{formatCurrency(report.expenseTotal)}</dd>
              </div>
              <div>
                <dt>Net profit</dt>
                <dd>{formatCurrency(report.netProfit)}</dd>
              </div>
              <div>
                <dt>Average invoice</dt>
                <dd>{formatCurrency(report.averageSale)}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2>Operations Summary</h2>
            <dl>
              <div>
                <dt>Invoices</dt>
                <dd>{report.saleCount}</dd>
              </div>
              <div>
                <dt>Stitching orders</dt>
                <dd>{report.stitchingCount}</dd>
              </div>
              <div>
                <dt>Pending stitching</dt>
                <dd>{report.pendingStitching}</dd>
              </div>
              <div>
                <dt>Low stock items</dt>
                <dd>{report.lowStockProducts.length}</dd>
              </div>
              <div>
                <dt>Pending tailor payable</dt>
                <dd>{formatCurrency(report.pendingTailorPayable)}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <h2>Sales Detail</h2>
            <p>Invoices created in the selected period.</p>
          </div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Status</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {report.recentSales.length ? (
                report.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.invoiceNumber}</td>
                    <td>{formatDate(sale.createdAt)}</td>
                    <td>{sale.customer?.name ?? "Walk-in"}</td>
                    <td>{sale.items.length}</td>
                    <td>{sale.paymentStatus}</td>
                    <td>{formatCurrency(sale.total)}</td>
                    <td>{formatCurrency(sale.paidAmount)}</td>
                    <td>{formatCurrency(asNumber(sale.total) - asNumber(sale.paidAmount))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>No sales recorded for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <h2>Stitching Orders</h2>
            <p>Production work created in the selected period.</p>
          </div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Garment</th>
                <th>Tailor</th>
                <th>Due</th>
                <th>Status</th>
                <th>Charge</th>
              </tr>
            </thead>
            <tbody>
              {report.stitchingOrders.length ? (
                report.stitchingOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td>
                    <td>{order.customer.name}</td>
                    <td>{order.garmentType}</td>
                    <td>{order.tailor?.name ?? "Not assigned"}</td>
                    <td>{formatDate(order.dueDate)}</td>
                    <td>{order.status}</td>
                    <td>{formatCurrency(order.stitchingCharge)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>No stitching orders recorded for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <h2>Expense Detail</h2>
            <p>Shop costs recorded in the selected period.</p>
          </div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.recentExpenses.length ? (
                report.recentExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.spentAt)}</td>
                    <td>{expense.category.replace("_", " ")}</td>
                    <td>{expense.description}</td>
                    <td>{expense.note ?? "-"}</td>
                    <td>{formatCurrency(expense.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No expenses recorded for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <h2>Inventory Alerts</h2>
            <p>Active stock items at or below the low-stock threshold.</p>
          </div>
          <table className="report-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Selling price</th>
              </tr>
            </thead>
            <tbody>
              {report.lowStockProducts.length ? (
                report.lowStockProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>{product.type.replace("_", " ")}</td>
                    <td>{formatQuantity(product.quantityOnHand, product.unit)}</td>
                    <td>{formatCurrency(product.sellingPrice)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No low-stock items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <footer className="report-footer">
          {organization.invoiceFooter || "Generated by TailorTrack."}
        </footer>
      </article>
    </main>
  );
}
