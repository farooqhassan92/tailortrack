import { NextResponse } from "next/server";

import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const organizationId = await getCurrentOrganizationId();
  const contains = {
    contains: query,
    mode: "insensitive" as const
  };

  const [customers, invoices, orders, products, tailors] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, phone: true },
      take: 5,
      where: {
        archivedAt: null,
        organizationId,
        OR: [{ name: contains }, { phone: contains }]
      }
    }),
    prisma.sale.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      where: {
        organizationId,
        OR: [
          { invoiceNumber: contains },
          { customer: { name: contains } },
          { customer: { phone: contains } }
        ]
      }
    }),
    prisma.stitchingOrder.findMany({
      include: { customer: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
      where: {
        organizationId,
        OR: [{ orderNumber: contains }, { garmentType: contains }, { customer: { name: contains } }]
      }
    }),
    prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, sku: true, type: true },
      take: 5,
      where: {
        archivedAt: null,
        organizationId,
        OR: [{ name: contains }, { sku: contains }]
      }
    }),
    prisma.tailor.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, phone: true },
      take: 5,
      where: {
        organizationId,
        OR: [{ name: contains }, { phone: contains }]
      }
    })
  ]);

  return NextResponse.json({
    results: [
      ...customers.map((customer) => ({
        href: `/customers/${customer.id}`,
        label: customer.name,
        meta: customer.phone,
        type: "Customer"
      })),
      ...invoices.map((invoice) => {
        const balance = asNumber(invoice.total) - asNumber(invoice.paidAmount);

        return {
          href: `/invoices?q=${encodeURIComponent(invoice.invoiceNumber)}`,
          label: invoice.invoiceNumber,
          meta: `${invoice.customer?.name ?? "Walk-in"} - ${invoice.paymentStatus} - Balance ${formatCurrency(balance)}`,
          type: "Invoice"
        };
      }),
      ...orders.map((order) => ({
        href: `/stitching-orders?status=${order.status}`,
        label: order.orderNumber,
        meta: `${order.customer.name} - ${order.garmentType}`,
        type: "Order"
      })),
      ...products.map((product) => ({
        href: "/inventory",
        label: product.name,
        meta: product.sku ?? product.type.replace("_", " "),
        type: "Product"
      })),
      ...tailors.map((tailor) => ({
        href: `/tailors/${tailor.id}`,
        label: tailor.name,
        meta: tailor.phone,
        type: "Tailor"
      }))
    ]
  });
}
