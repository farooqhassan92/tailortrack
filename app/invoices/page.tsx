import Link from "next/link";
import type { Route } from "next";
import type { PaymentStatus, Prisma } from "@prisma/client";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  ReceiptText,
  Search
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DecimalLike = {
  toNumber: () => number;
};

const statusOptions = [
  { label: "All", value: "all" },
  { label: "Unpaid", value: "UNPAID" },
  { label: "Partial", value: "PARTIAL" },
  { label: "Paid", value: "PAID" }
] as const;

type StatusFilter = "all" | PaymentStatus;
const pageSize = 25;

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

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function getStatus(value: string | string[] | undefined): StatusFilter {
  const selectedValue = Array.isArray(value) ? value[0] : value;

  if (selectedValue === "UNPAID" || selectedValue === "PARTIAL" || selectedValue === "PAID") {
    return selectedValue;
  }

  return "all";
}

function getPage(value: string | string[] | undefined) {
  const selectedValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(selectedValue ?? "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

function invoicesHref({
  page,
  q,
  status
}: {
  page?: number;
  q?: string;
  status: StatusFilter;
}) {
  return `/invoices?${new URLSearchParams({
    ...(q ? { q } : {}),
    status,
    ...(page && page > 1 ? { page: String(page) } : {})
  }).toString()}` as Route;
}

function statusTone(status: string) {
  if (status === "PAID") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (status === "PARTIAL") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }

  return "border-rose-100 bg-rose-50 text-rose-700";
}

export default async function InvoicesPage({
  searchParams
}: {
  searchParams?: Promise<{ page?: string | string[]; q?: string | string[]; status?: string | string[] }>;
}) {
  const organizationId = await getCurrentOrganizationId();
  const params = await searchParams;
  const selectedStatus = getStatus(params?.status);
  const currentPage = getPage(params?.page);
  const queryValue = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const query = queryValue?.trim() ?? "";
  const statusWhere: Prisma.SaleWhereInput =
    selectedStatus === "all" ? {} : { paymentStatus: selectedStatus };
  const queryWhere: Prisma.SaleWhereInput = query
    ? {
        OR: [
          { invoiceNumber: { contains: query, mode: "insensitive" as const } },
          { customer: { name: { contains: query, mode: "insensitive" as const } } },
          { customer: { phone: { contains: query, mode: "insensitive" as const } } }
        ]
      }
    : {};
  const where: Prisma.SaleWhereInput = {
    organizationId,
    ...statusWhere,
    ...queryWhere
  };

  const [invoices, totals, invoiceCount, openInvoiceCount] = await Promise.all([
    prisma.sale.findMany({
      include: {
        customer: true,
        items: true
      },
      orderBy: {
        createdAt: "desc"
      },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      where
    }),
    prisma.sale.aggregate({
      _sum: {
        paidAmount: true,
        total: true
      },
      where
    }),
    prisma.sale.count({
      where
    }),
    prisma.sale.count({
      where: {
        ...queryWhere,
        organizationId,
        paymentStatus: {
          in: ["UNPAID", "PARTIAL"]
        }
      }
    })
  ]);

  const totalAmount = asNumber(totals._sum.total);
  const paidAmount = asNumber(totals._sum.paidAmount);
  const balanceAmount = totalAmount - paidAmount;
  const totalPages = Math.max(1, Math.ceil(invoiceCount / pageSize));
  const previousPageHref = currentPage > 1
    ? invoicesHref({ page: currentPage - 1, q: query, status: selectedStatus })
    : null;
  const nextPageHref = currentPage < totalPages
    ? invoicesHref({ page: currentPage + 1, q: query, status: selectedStatus })
    : null;

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.36),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(14,165,233,0.24),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(16,185,129,0.14),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-xl shadow-black/20">
                    <ReceiptText aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                      Invoice desk
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      Invoices
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Search invoices, review payment status, and open balances for collection.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[34rem]">
                {[
                  { icon: FileText, label: "Invoices", value: invoiceCount },
                  { icon: Banknote, label: "Total", value: formatCurrency(totalAmount) },
                  { icon: CheckCircle2, label: "Paid", value: formatCurrency(paidAmount) },
                  { icon: Clock3, label: "Open", value: openInvoiceCount }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white shadow-sm backdrop-blur"
                      key={stat.label}
                    >
                      <div className="mb-3 flex size-8 items-center justify-center rounded-xl bg-cyan-300/15 text-cyan-100">
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

        <section className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <form action="/invoices" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] xl:min-w-[30rem]">
              <input name="status" type="hidden" value={selectedStatus} />
              <label className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                  defaultValue={query}
                  name="q"
                  placeholder="Search invoice, customer, or phone"
                />
              </label>
              <PendingSubmitButton
                className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                pendingText="Searching..."
              >
                Search
              </PendingSubmitButton>
            </form>

            <div className="flex gap-2 overflow-x-auto">
              {statusOptions.map((option) => {
                const href = invoicesHref({ q: query, status: option.value });

                return (
                  <Link
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      selectedStatus === option.value
                        ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                        : "border border-slate-100 bg-white text-slate-600 hover:text-slate-950"
                    }`}
                    href={href}
                    key={option.value}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-sm backdrop-blur">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Invoice list</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Showing {invoices.length} of {invoiceCount} matching invoices.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2 text-sm">
                <span className="text-slate-500">Balance due </span>
                <span className="font-semibold text-slate-950">{formatCurrency(balanceAmount)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:hidden">
            {invoices.length ? (
              invoices.map((invoice) => {
                const balance = asNumber(invoice.total) - asNumber(invoice.paidAmount);
                const detailHref = `/sales/${invoice.id}` as Route;

                return (
                  <article
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    key={invoice.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          className="block truncate text-sm font-semibold text-slate-950"
                          href={detailHref}
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(invoice.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(invoice.paymentStatus)}`}
                      >
                        {invoice.paymentStatus}
                      </span>
                    </div>
                    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-950">
                        {invoice.customer?.name ?? "Walk-in"}
                      </p>
                      {invoice.customer?.phone ? (
                        <p className="mt-1 text-xs text-slate-500">{invoice.customer.phone}</p>
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-slate-500">Total</p>
                        <p className="font-semibold text-slate-950">
                          {formatCurrency(invoice.total)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Balance</p>
                        <p className="font-semibold text-slate-950">{formatCurrency(balance)}</p>
                      </div>
                    </div>
                    <Link
                      className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                        balance > 0
                          ? "bg-slate-950 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                      href={detailHref}
                    >
                      <CreditCard aria-hidden="true" className="size-3.5" />
                      {balance > 0 ? "Settle balance" : "Open invoice"}
                    </Link>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No invoices found for this search.
              </div>
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Invoice</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 text-right font-semibold">Paid</th>
                  <th className="px-5 py-3 text-right font-semibold">Balance</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoices.length ? (
                  invoices.map((invoice) => {
                    const balance = asNumber(invoice.total) - asNumber(invoice.paidAmount);
                    const detailHref = `/sales/${invoice.id}` as Route;

                    return (
                      <tr className="transition hover:bg-cyan-50/40" key={invoice.id}>
                        <td className="px-5 py-4">
                          <Link
                            className="font-semibold text-slate-950 hover:text-cyan-700"
                            href={detailHref}
                          >
                            {invoice.invoiceNumber}
                          </Link>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDateTime(invoice.createdAt)}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          <p className="font-medium text-slate-800">
                            {invoice.customer?.name ?? "Walk-in"}
                          </p>
                          {invoice.customer?.phone ? (
                            <p className="mt-1 text-xs text-slate-500">{invoice.customer.phone}</p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {invoice.items.length} item{invoice.items.length === 1 ? "" : "s"}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-950">
                          {formatCurrency(invoice.total)}
                        </td>
                        <td className="px-5 py-4 text-right text-slate-600">
                          {formatCurrency(invoice.paidAmount)}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-950">
                          {formatCurrency(balance)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(invoice.paymentStatus)}`}
                          >
                            {invoice.paymentStatus}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              balance > 0
                                ? "bg-slate-950 text-white shadow-sm"
                                : "border border-slate-200 bg-white text-slate-700 hover:text-slate-950"
                            }`}
                            href={detailHref}
                          >
                            <CreditCard aria-hidden="true" className="size-3.5" />
                            {balance > 0 ? "Settle" : "Open"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-5 py-10 text-center text-slate-500" colSpan={8}>
                      No invoices found for this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {invoiceCount > pageSize ? (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                {previousPageHref ? (
                  <Link
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:text-slate-950"
                    href={previousPageHref}
                  >
                    Previous
                  </Link>
                ) : (
                  <span className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 font-semibold text-slate-400">
                    Previous
                  </span>
                )}
                {nextPageHref ? (
                  <Link
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:text-slate-950"
                    href={nextPageHref}
                  >
                    Next
                  </Link>
                ) : (
                  <span className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 font-semibold text-slate-400">
                    Next
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
