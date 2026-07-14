import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";

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
    { label: `${selectedPeriodLabel} Sales`, value: formatCurrency(saleTotals._sum.total) },
    { label: `${selectedPeriodLabel} Paid`, value: formatCurrency(saleTotals._sum.paidAmount) },
    { label: `${selectedPeriodLabel} Bills`, value: saleCount.toString() },
    { label: `${selectedPeriodLabel} Unpaid`, value: formatCurrency(unpaidBalance) }
  ];

  const stitchingStats = [
    { label: `${selectedPeriodLabel} Orders`, value: stitchingCount.toString() },
    { label: `${selectedPeriodLabel} Pending`, value: pendingStitching.toString() },
    { label: `${selectedPeriodLabel} Ready`, value: readyOrders.toString() },
    { label: `${selectedPeriodLabel} Delivered`, value: deliveredOrders.toString() }
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track shop sales, stitching orders, stock, and tailor work.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {periodOptions.map((period) => (
            <a
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                period.value === selectedPeriod
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              }`}
              href={`/dashboard?period=${period.value}`}
              key={period.value}
            >
              {period.label}
            </a>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950">Sales Records</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {salesStats.map((stat) => (
              <div className="rounded-lg border border-slate-200 bg-white p-5" key={stat.label}>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-950">Stitching Records</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stitchingStats.map((stat) => (
              <div className="rounded-lg border border-slate-200 bg-white p-5" key={stat.label}>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
