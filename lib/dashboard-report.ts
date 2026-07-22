import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

export const periodOptions = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" }
] as const;

export type PeriodValue = (typeof periodOptions)[number]["value"];

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

export function asNumber(value: DecimalLike | number | null | undefined) {
  if (!value) {
    return 0;
  }

  return typeof value === "number" ? value : value.toNumber();
}

export function formatCurrency(value: DecimalLike | number | null | undefined) {
  return `Rs. ${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0
  }).format(asNumber(value))}`;
}

export function formatQuantity(value: DecimalLike | number | null | undefined, unit: string) {
  return `${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 2
  }).format(asNumber(value))} ${unit}`;
}

export function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium"
  }).format(value);
}

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

export function getPeriodStart(period: PeriodValue, date: Date) {
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

export function getSelectedPeriod(value: string | string[] | undefined): PeriodValue {
  const selectedValue = Array.isArray(value) ? value[0] : value;
  return periodOptions.some((period) => period.value === selectedValue)
    ? (selectedValue as PeriodValue)
    : "daily";
}

export async function getDashboardSummary(period: PeriodValue) {
  const organizationId = await getCurrentOrganizationId();
  const now = new Date();
  const startDate = getPeriodStart(period, now);
  const todayStart = startOfDay(now);
  const selectedPeriodLabel =
    periodOptions.find((periodOption) => periodOption.value === period)?.label ?? "Daily";
  const periodWhere = {
    createdAt: {
      gte: startDate,
      lte: now
    },
    organizationId
  };

  const [
    saleTotals,
    pendingStitching,
    lowStockProducts,
    activeProductCount,
    activeCustomerCount,
    allSaleCount,
    setupRateCount,
    todayPayments,
    todayExpenseTotals,
    todaySalaryPaidTotals
  ] = await Promise.all([
    prisma.sale.aggregate({
      _sum: {
        paidAmount: true,
        total: true
      },
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
    prisma.product.findMany({
      orderBy: {
        quantityOnHand: "asc"
      },
      select: {
        id: true
      },
      take: 8,
      where: {
        organizationId,
        archivedAt: null,
        quantityOnHand: {
          lte: 5
        },
        type: {
          not: "STITCHING_SERVICE"
        }
      }
    }),
    prisma.product.count({
      where: {
        organizationId,
        archivedAt: null,
        type: {
          not: "STITCHING_SERVICE"
        }
      }
    }),
    prisma.customer.count({
      where: {
        archivedAt: null,
        organizationId
      }
    }),
    prisma.sale.count({
      where: {
        organizationId
      }
    }),
    prisma.product.count({
      where: {
        archivedAt: null,
        organizationId,
        type: "STITCHING_SERVICE"
      }
    }),
    prisma.payment.findMany({
      where: {
        createdAt: {
          gte: todayStart,
          lte: now
        },
        sale: {
          organizationId
        }
      }
    }),
    prisma.expense.aggregate({
      _sum: {
        amount: true
      },
      where: {
        organizationId,
        spentAt: {
          gte: todayStart,
          lte: now
        }
      }
    }),
    prisma.tailorSalaryBatch.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        createdAt: {
          gte: todayStart,
          lte: now
        },
        organizationId,
        voidedAt: null
      }
    })
  ]);

  const totalSales = asNumber(saleTotals._sum.total);
  const paidSales = asNumber(saleTotals._sum.paidAmount);
  const todayCashIn = todayPayments.reduce((sum, payment) => sum + asNumber(payment.amount), 0);
  const todayExpenses = asNumber(todayExpenseTotals._sum.amount);
  const todaySalaryPaid = asNumber(todaySalaryPaidTotals._sum.totalAmount);
  const todayPaymentByMethod = todayPayments.reduce<Record<string, number>>((totals, payment) => {
    totals[payment.method] = (totals[payment.method] ?? 0) + asNumber(payment.amount);
    return totals;
  }, {});

  return {
    dailyCash: {
      expenses: todayExpenses,
      netCash: todayCashIn - todayExpenses - todaySalaryPaid,
      paymentsByMethod: todayPaymentByMethod,
      salaryPaid: todaySalaryPaid,
      totalReceived: todayCashIn
    },
    lowStockProducts,
    pendingStitching,
    selectedPeriodLabel,
    setup: {
      hasCustomers: activeCustomerCount > 0,
      hasInventory: activeProductCount > 0,
      hasRates: setupRateCount > 0,
      hasSales: allSaleCount > 0
    },
    unpaidBalance: totalSales - paidSales
  };
}

export async function getDashboardReport(period: PeriodValue) {
  const organizationId = await getCurrentOrganizationId();
  const now = new Date();
  const startDate = getPeriodStart(period, now);
  const todayStart = startOfDay(now);
  const selectedPeriodLabel =
    periodOptions.find((periodOption) => periodOption.value === period)?.label ?? "Daily";
  const periodWhere = {
    createdAt: {
      gte: startDate,
      lte: now
    },
    organizationId
  };
  const expensePeriodWhere = {
    organizationId,
    spentAt: {
      gte: startDate,
      lte: now
    }
  };

  const [
    saleTotals,
    saleCount,
    stitchingCount,
    pendingStitching,
    readyOrders,
    deliveredOrders,
    recentSales,
    stitchingOrders,
    lowStockProducts,
    activeProductCount,
    activeCustomerCount,
    allSaleCount,
    setupRateCount,
    expenseTotals,
    recentExpenses,
    salaryPaidTotals,
    todayPayments,
    todayExpenseTotals,
    todaySalaryPaidTotals,
    periodSaleItems,
    unpaidTailorOrders,
    stitchingRates
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
    }),
    prisma.sale.findMany({
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            stitchingOrder: true
          },
          orderBy: {
            id: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 12,
      where: periodWhere
    }),
    prisma.stitchingOrder.findMany({
      include: {
        customer: true,
        tailor: true
      },
      orderBy: [
        {
          dueDate: "asc"
        },
        {
          createdAt: "desc"
        }
      ],
      take: 10,
      where: {
        ...periodWhere,
        status: {
          not: "CANCELLED"
        }
      }
    }),
    prisma.product.findMany({
      orderBy: {
        quantityOnHand: "asc"
      },
      take: 8,
      where: {
        organizationId,
        archivedAt: null,
        quantityOnHand: {
          lte: 5
        },
        type: {
          not: "STITCHING_SERVICE"
        }
      }
    }),
    prisma.product.count({
      where: {
        organizationId,
        archivedAt: null,
        type: {
          not: "STITCHING_SERVICE"
        }
      }
    }),
    prisma.customer.count({
      where: {
        archivedAt: null,
        organizationId
      }
    }),
    prisma.sale.count({
      where: {
        organizationId
      }
    }),
    prisma.product.count({
      where: {
        archivedAt: null,
        organizationId,
        type: "STITCHING_SERVICE"
      }
    }),
    prisma.expense.aggregate({
      _sum: {
        amount: true
      },
      where: expensePeriodWhere
    }),
    prisma.expense.findMany({
      orderBy: {
        spentAt: "desc"
      },
      take: 8,
      where: expensePeriodWhere
    }),
    prisma.tailorSalaryBatch.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        ...periodWhere,
        voidedAt: null
      }
    }),
    prisma.payment.findMany({
      include: {
        sale: true
      },
      where: {
        createdAt: {
          gte: todayStart,
          lte: now
        },
        sale: {
          organizationId
        }
      }
    }),
    prisma.expense.aggregate({
      _sum: {
        amount: true
      },
      where: {
        organizationId,
        spentAt: {
          gte: todayStart,
          lte: now
        }
      }
    }),
    prisma.tailorSalaryBatch.aggregate({
      _sum: {
        totalAmount: true
      },
      where: {
        createdAt: {
          gte: todayStart,
          lte: now
        },
        organizationId,
        voidedAt: null
      }
    }),
    prisma.saleItem.findMany({
      include: {
        product: true,
        sale: true
      },
      where: {
        sale: periodWhere
      }
    }),
    prisma.stitchingOrder.findMany({
      select: {
        garmentType: true
      },
      where: {
        salaryLines: {
          none: {
            batch: {
              voidedAt: null
            }
          }
        },
        status: {
          in: ["READY", "DELIVERED"]
        },
        organizationId,
        tailorId: {
          not: null
        }
      }
    }),
    prisma.product.findMany({
      select: {
        costPrice: true,
        name: true
      },
      where: {
        archivedAt: null,
        organizationId,
        type: "STITCHING_SERVICE"
      }
    })
  ]);

  const totalSales = asNumber(saleTotals._sum.total);
  const paidSales = asNumber(saleTotals._sum.paidAmount);
  const unpaidBalance = totalSales - paidSales;
  const averageSale = saleCount ? totalSales / saleCount : 0;
  const expenseTotal = asNumber(expenseTotals._sum.amount);
  const salaryPaidTotal = asNumber(salaryPaidTotals._sum.totalAmount);
  const todayCashIn = todayPayments.reduce((sum, payment) => sum + asNumber(payment.amount), 0);
  const todayExpenses = asNumber(todayExpenseTotals._sum.amount);
  const todaySalaryPaid = asNumber(todaySalaryPaidTotals._sum.totalAmount);
  const todayPaymentByMethod = todayPayments.reduce<Record<string, number>>((totals, payment) => {
    totals[payment.method] = (totals[payment.method] ?? 0) + asNumber(payment.amount);
    return totals;
  }, {});
  const inventoryCost = periodSaleItems.reduce((sum, item) => {
    if (!item.product) {
      return sum;
    }

    return sum + asNumber(item.product.costPrice) * asNumber(item.quantity);
  }, 0);
  const rateByGarmentType = new Map(
    stitchingRates.map((rate) => [rate.name.trim().toLowerCase(), rate.costPrice])
  );
  const pendingTailorPayable = unpaidTailorOrders.reduce((sum, order) => {
    const rate = rateByGarmentType.get(order.garmentType.trim().toLowerCase());

    return sum + asNumber(rate);
  }, 0);
  const netProfit = paidSales - inventoryCost - salaryPaidTotal - expenseTotal;

  return {
    activeCustomerCount,
    activeProductCount,
    averageSale,
    dailyCash: {
      expenses: todayExpenses,
      netCash: todayCashIn - todayExpenses - todaySalaryPaid,
      paymentsByMethod: todayPaymentByMethod,
      salaryPaid: todaySalaryPaid,
      totalReceived: todayCashIn
    },
    deliveredOrders,
    endDate: now,
    expenseTotal,
    inventoryCost,
    lowStockProducts,
    netProfit,
    paidSales,
    pendingTailorPayable,
    pendingStitching,
    period,
    recentExpenses,
    recentSales,
    readyOrders,
    saleCount,
    selectedPeriodLabel,
    setup: {
      hasCustomers: activeCustomerCount > 0,
      hasInventory: activeProductCount > 0,
      hasRates: setupRateCount > 0,
      hasSales: allSaleCount > 0
    },
    salaryPaidTotal,
    startDate,
    stitchingCount,
    stitchingOrders,
    totalSales,
    unpaidBalance
  };
}
