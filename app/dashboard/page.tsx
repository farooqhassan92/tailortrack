import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Clock3,
  CreditCard,
  PackageCheck,
  ReceiptText,
  Scissors
} from "lucide-react";

export const dynamic = "force-dynamic";

const periodOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" }
] as const;

type PeriodValue = (typeof periodOptions)[number]["value"];

type DecimalLike = {
  toNumber: () => number;
};

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function startOfWeek(date: Date) {
  const nextDate = startOfDay(date);
  const day = nextDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  nextDate.setDate(nextDate.getDate() + mondayOffset);
  return nextDate;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

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

function getPeriodStart(period: PeriodValue, date: Date) {
  if (period === "weekly") {
    return startOfWeek(date);
  }

  if (period === "monthly") {
    return startOfMonth(date);
  }

  if (period === "yearly") {
    return startOfYear(date);
  }

  return startOfDay(date);
}

function getSelectedPeriod(value: string | string[] | undefined): PeriodValue {
  const selectedValue = Array.isArray(value) ? value[0] : value;
  return periodOptions.some((period) => period.value === selectedValue)
    ? (selectedValue as PeriodValue)
    : "daily";
}

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ period?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedPeriod = getSelectedPeriod(params?.period);
  const now = new Date();
  const startDate = getPeriodStart(selectedPeriod, now);
  const selectedPeriodLabel =
    periodOptions.find((period) => period.value === selectedPeriod)?.label ?? "Daily";

  const periodWhere = {
    createdAt: {
      gte: startDate
    }
  };

  const [
    saleTotals,
    saleCount,
    stitchingCount,
    pendingStitching,
    readyOrders,
    deliveredOrders
  ] = await Promise.all([
    prisma.sale.aggregate({
      _sum: {
        paidAmount: true,
        total: true
      },
      where: periodWhere
    }),
    prisma.sale.count({
      where: periodWhere
    }),
    prisma.stitchingOrder.count({
      where: periodWhere
    }),
    prisma.stitchingOrder.count({
      where: {
        ...periodWhere,
        status: {
          in: ["PENDING", "CUTTING", "STITCHING"]
        }
      }
    }),
    prisma.stitchingOrder.count({
      where: {
        ...periodWhere,
        status: "READY"
      }
    }),
    prisma.stitchingOrder.count({
      where: {
        ...periodWhere,
        status: "DELIVERED"
      }
    })
  ]);

  const unpaidBalance =
    asNumber(saleTotals._sum.total) - asNumber(saleTotals._sum.paidAmount);

  const salesStats = [
    {
      label: `${selectedPeriodLabel} Sales`,
      value: formatCurrency(saleTotals._sum.total),
      icon: Banknote,
      accent: "from-teal-500 to-emerald-500"
    },
    {
      label: `${selectedPeriodLabel} Paid`,
      value: formatCurrency(saleTotals._sum.paidAmount),
      icon: CreditCard,
      accent: "from-sky-500 to-cyan-500"
    },
    {
      label: `${selectedPeriodLabel} Bills`,
      value: saleCount.toString(),
      icon: ReceiptText,
      accent: "from-violet-500 to-fuchsia-500"
    },
    {
      label: `${selectedPeriodLabel} Unpaid`,
      value: formatCurrency(unpaidBalance),
      icon: Clock3,
      accent: "from-amber-500 to-orange-500"
    }
  ];

  const stitchingStats = [
    {
      label: `${selectedPeriodLabel} Orders`,
      value: stitchingCount.toString(),
      icon: Scissors,
      accent: "from-slate-700 to-slate-950"
    },
    {
      label: `${selectedPeriodLabel} Pending`,
      value: pendingStitching.toString(),
      icon: Clock3,
      accent: "from-rose-500 to-pink-500"
    },
    {
      label: `${selectedPeriodLabel} Ready`,
      value: readyOrders.toString(),
      icon: PackageCheck,
      accent: "from-indigo-500 to-blue-500"
    },
    {
      label: `${selectedPeriodLabel} Delivered`,
      value: deliveredOrders.toString(),
      icon: BadgeCheck,
      accent: "from-lime-500 to-teal-500"
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
                  Track sales, stitching orders, stock, and tailor work from one responsive
                  workspace.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
                <p className="text-sm font-medium text-slate-300">Selected report</p>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="text-2xl font-semibold">{selectedPeriodLabel}</span>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-slate-950">
                    <ArrowUpRight aria-hidden="true" className="size-5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/80 bg-white/70 p-2 shadow-sm backdrop-blur">
          {periodOptions.map((period) => (
            <a
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                period.value === selectedPeriod
                  ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                  : "text-slate-600 hover:bg-white hover:text-slate-950"
              }`}
              href={`/dashboard?period=${period.value}`}
              key={period.value}
            >
              {period.label}
            </a>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Revenue
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Sales Records</h2>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {salesStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  className="group rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/10"
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
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Production
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">Stitching Records</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stitchingStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  className="group rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/10"
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
        </div>
      </div>
    </AppShell>
  );
}
