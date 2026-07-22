import Link from "next/link";
import type { Route } from "next";
import {
  Banknote,
  Boxes,
  Clock3,
  FileText,
  ListChecks,
  PackagePlus,
  PlusCircle,
  ReceiptText,
  Scissors,
  Search,
  UserPlus,
  WalletCards
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import {
  formatCurrency,
  getDashboardSummary,
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
  const report = await getDashboardSummary(selectedPeriod);
  const reportHref = `/dashboard/report?period=${selectedPeriod}` as Route;
  const pdfHref = `/dashboard/report?period=${selectedPeriod}&print=1` as Route;

  const quickActions = [
    { href: "/sales", icon: PlusCircle, label: "New sale" },
    { href: "/customers", icon: UserPlus, label: "Add customer" },
    { href: "/inventory", icon: PackagePlus, label: "Add inventory" },
    { href: "/expenses", icon: WalletCards, label: "Add expense" },
    { href: "/invoices", icon: ReceiptText, label: "Invoices" }
  ] as const;
  const dailyCashStats = [
    { label: "Received today", value: formatCurrency(report.dailyCash.totalReceived) },
    { label: "Expenses today", value: formatCurrency(report.dailyCash.expenses) },
    { label: "Salary paid today", value: formatCurrency(report.dailyCash.salaryPaid) },
    { label: "Net cash movement", value: formatCurrency(report.dailyCash.netCash) }
  ];
  const keySignals = [
    {
      accent: "from-emerald-500 to-teal-500",
      icon: Banknote,
      label: "Cash received today",
      value: formatCurrency(report.dailyCash.totalReceived)
    },
    {
      accent: "from-amber-500 to-orange-500",
      icon: Clock3,
      label: "Open invoice balance",
      value: formatCurrency(report.unpaidBalance)
    },
    {
      accent: "from-violet-500 to-indigo-500",
      icon: Scissors,
      label: "Pending stitching",
      value: report.pendingStitching.toString()
    },
    {
      accent: "from-slate-700 to-slate-950",
      icon: Boxes,
      label: "Low stock items",
      value: report.lowStockProducts.length.toString()
    }
  ];
  const setupItems = [
    {
      complete: report.setup.hasRates,
      href: "/salaries",
      label: "Define stitching rates"
    },
    {
      complete: report.setup.hasCustomers,
      href: "/customers",
      label: "Add first customer"
    },
    {
      complete: report.setup.hasInventory,
      href: "/inventory",
      label: "Add inventory"
    },
    {
      complete: report.setup.hasSales,
      href: "/sales",
      label: "Create first sale"
    }
  ] as const;
  const isSetupComplete = setupItems.every((item) => item.complete);
  const paymentMethodEntries = Object.entries(report.dailyCash.paymentsByMethod);

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.42),transparent_23rem),radial-gradient(circle_at_82%_22%,rgba(56,189,248,0.22),transparent_20rem)]" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">
                  Daily control center
                </p>
                <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  Dashboard
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Start with the work that needs attention today. Open the report when you need
                  full business detail.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
                <p className="text-sm font-medium text-slate-300">Selected view</p>
                <p className="mt-3 text-2xl font-semibold">{report.selectedPeriodLabel}</p>
                <p className="mt-2 text-sm text-slate-300">Report links stay below.</p>
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

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                <Search aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Quick actions</h2>
                <p className="text-sm text-slate-500">Common shop work in one tap.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-100 hover:bg-teal-50 hover:text-teal-800"
                    href={action.href as Route}
                    key={action.href}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {action.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {!isSetupComplete ? (
            <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <ListChecks aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Setup checklist</h2>
                  <p className="text-sm text-slate-500">Finish the basics once.</p>
                </div>
              </div>
              <div className="grid gap-2">
                {setupItems.map((item) => (
                  <Link
                    className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold ${
                      item.complete
                        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                        : "border-amber-100 bg-amber-50 text-amber-800"
                    }`}
                    href={item.href as Route}
                    key={item.label}
                  >
                    {item.label}
                    <span>{item.complete ? "Done" : "Open"}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <ListChecks aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Shop setup</h2>
                  <p className="text-sm text-slate-500">Your core setup is complete.</p>
                </div>
              </div>
              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                Use the dashboard for today&apos;s priorities and open the report for deep review.
              </p>
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {keySignals.map((stat) => {
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

        <section className="rounded-3xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Today&apos;s cash report</h2>
              <p className="text-sm text-slate-500">
                Payments, expenses, and salary movement recorded today.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              {paymentMethodEntries.length ? (
                paymentMethodEntries.map(([method, amount]) => (
                  <span className="rounded-full bg-slate-100 px-3 py-1" key={method}>
                    {method.replace("_", " ")} {formatCurrency(amount)}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  No payments recorded today
                </span>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dailyCashStats.map((stat) => (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3" key={stat.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-950">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
