import { AppShell } from "@/components/layout/app-shell";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { getCurrentOrganizationId } from "@/lib/organization";
import { prisma } from "@/lib/prisma";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Banknote,
  Boxes,
  ClipboardList,
  Layers3,
  Package,
  PackagePlus,
  Pencil,
  Ruler,
  Search,
  Shirt,
  SlidersHorizontal,
  Tags,
  Trash2
} from "lucide-react";

import {
  createInventoryItem,
  deleteInventoryItem,
  recordInventoryMovement,
  updateInventoryItem
} from "./actions";

export const dynamic = "force-dynamic";

const typeLabels = {
  READYMADE: "Readymade",
  UNSTITCHED: "Unstitched",
  STITCHING_SERVICE: "Service"
} as const;

const inventoryCategories = [
  {
    value: "UNSTITCHED_ROLLS",
    label: "Unstitched Rolls",
    description: "Fabric measured and sold by meter",
    type: "UNSTITCHED",
    unit: "meter",
    tone: "bg-teal-50 text-teal-700",
    panel: "from-teal-50/90 to-white",
    border: "border-teal-100",
    icon: Ruler
  },
  {
    value: "UNSTITCHED_BOXES",
    label: "Unstitched Boxes",
    description: "Packed fabric boxes or bundles",
    type: "UNSTITCHED",
    unit: "box",
    tone: "bg-emerald-50 text-emerald-700",
    panel: "from-emerald-50/90 to-white",
    border: "border-emerald-100",
    icon: Package
  },
  {
    value: "SUITING",
    label: "Suiting",
    description: "Suiting fabric and suit pieces",
    type: "UNSTITCHED",
    unit: "meter",
    tone: "bg-indigo-50 text-indigo-700",
    panel: "from-indigo-50/90 to-white",
    border: "border-indigo-100",
    icon: Layers3
  },
  {
    value: "READYMADE",
    label: "Readymade",
    description: "Finished garments sold by piece",
    type: "READYMADE",
    unit: "piece",
    tone: "bg-sky-50 text-sky-700",
    panel: "from-sky-50/90 to-white",
    border: "border-sky-100",
    icon: Shirt
  },
  {
    value: "ACCESSORIES",
    label: "Accessories",
    description: "Buttons, collars, lining, and extras",
    type: "READYMADE",
    unit: "piece",
    tone: "bg-amber-50 text-amber-700",
    panel: "from-amber-50/90 to-white",
    border: "border-amber-100",
    icon: Tags
  },
  {
    value: "SERVICES",
    label: "Services",
    description: "Non-stock stitching services",
    type: "STITCHING_SERVICE",
    unit: "service",
    tone: "bg-slate-100 text-slate-700",
    panel: "from-slate-50 to-white",
    border: "border-slate-100",
    icon: ClipboardList
  }
] as const;

const movementOptions = [
  { label: "Stock in", value: "STOCK_IN" },
  { label: "Stock out", value: "SALE" },
  { label: "Return", value: "RETURN" },
  { label: "Adjust", value: "ADJUSTMENT" }
] as const;

const pageSize = 30;

const statusMessages = {
  "archived-code": {
    text: "That internal code belongs to an archived item. Restore it before adding stock.",
    variant: "warning"
  },
  archived: {
    text: "Inventory item removed from active stock.",
    variant: "success"
  },
  created: {
    text: "Inventory item added.",
    variant: "success"
  },
  "delete-missing": {
    text: "Select an inventory item before removing it.",
    variant: "warning"
  },
  "duplicate-code": {
    text: "That internal code is already used. Leave the code empty or enter a unique code.",
    variant: "warning"
  },
  "invalid-number": {
    text: "Enter valid numbers for quantity, cost, and sale price.",
    variant: "warning"
  },
  missing: {
    text: "Item name is required.",
    variant: "warning"
  },
  "movement-missing": {
    text: "Select an item and enter a quantity before updating stock.",
    variant: "warning"
  },
  restored: {
    text: "Inventory item restored.",
    variant: "success"
  },
  restocked: {
    text: "Existing inventory item restocked.",
    variant: "success"
  },
  "restore-missing": {
    text: "Select an inventory item before restoring it.",
    variant: "warning"
  },
  "stock-updated": {
    text: "Stock updated.",
    variant: "success"
  },
  updated: {
    text: "Inventory item details updated.",
    variant: "success"
  }
} as const;

type DecimalLike = {
  toNumber: () => number;
};

function asNumber(value: DecimalLike | number | null | undefined) {
  if (!value) {
    return 0;
  }

  return typeof value === "number" ? value : value.toNumber();
}

function formatQuantity(value: DecimalLike | number | null | undefined, unit: string) {
  return `${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 2
  }).format(asNumber(value))} ${unit}`;
}

function formatCurrency(value: DecimalLike | number | null | undefined) {
  return `Rs. ${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0
  }).format(asNumber(value))}`;
}

function getPage(value: string | string[] | undefined) {
  const selectedValue = Array.isArray(value) ? value[0] : value;
  const page = Number(selectedValue);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function Page({
  searchParams
}: {
  searchParams?: Promise<{
    category?: string | string[];
    page?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
}) {
  const organizationId = await getCurrentOrganizationId();
  const params = await searchParams;
  const currentPage = getPage(params?.page);
  const selectedCategory = Array.isArray(params?.category)
    ? params?.category[0]
    : params?.category;
  const query = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const status = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const statusMessage = getStatusMessage(statusMessages, status);
  const normalizedQuery = query?.trim() ?? "";
  const categoryFilter = inventoryCategories.some((category) => category.value === selectedCategory)
    ? (selectedCategory as (typeof inventoryCategories)[number]["value"])
    : "UNSTITCHED_ROLLS";

  const where = {
    archivedAt: null,
    organizationId,
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(normalizedQuery
      ? {
          OR: [
            { name: { contains: normalizedQuery, mode: "insensitive" as const } },
            { sku: { contains: normalizedQuery, mode: "insensitive" as const } },
            { color: { contains: normalizedQuery, mode: "insensitive" as const } },
            { fabricType: { contains: normalizedQuery, mode: "insensitive" as const } }
          ]
        }
      : {})
  };

  const [products, productCount, allInventoryProducts, movementProducts, recentMovements] =
    await Promise.all([
    prisma.product.findMany({
      orderBy: {
        updatedAt: "desc"
      },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      where
    }),
    prisma.product.count({
      where
    }),
    prisma.product.findMany({
      select: {
        costPrice: true,
        quantityOnHand: true
      },
      where: {
        archivedAt: null,
        organizationId,
        type: {
          not: "STITCHING_SERVICE"
        }
      }
    }),
    prisma.product.findMany({
      orderBy: {
        name: "asc"
      },
      select: {
        id: true,
        name: true,
        sku: true
      },
      where: {
        archivedAt: null,
        organizationId,
        type: {
          not: "STITCHING_SERVICE"
        }
      }
    }),
    prisma.inventoryMovement.findMany({
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            unit: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5,
      where: {
        organizationId
      }
    })
  ]);

  const activeCategory = inventoryCategories.find((category) => category.value === categoryFilter);
  const productsByCategory = inventoryCategories.map((category) => ({
    ...category,
    products: products.filter((product) => product.category === category.value)
  }));
  const categoryStockValue = products.reduce(
    (sum, product) => sum + asNumber(product.quantityOnHand) * asNumber(product.costPrice),
    0
  );
  const totalInventoryCost = allInventoryProducts.reduce(
    (sum, product) => sum + asNumber(product.quantityOnHand) * asNumber(product.costPrice),
    0
  );
  const categoryQuantity = products.reduce(
    (sum, product) => sum + asNumber(product.quantityOnHand),
    0
  );
  const categoryLowStockCount = products.filter(
    (product) => product.type !== "STITCHING_SERVICE" && asNumber(product.quantityOnHand) <= 3
  ).length;
  const totalPages = Math.max(Math.ceil(productCount / pageSize), 1);
  const previousPageHref = `/inventory?${new URLSearchParams({
    ...(normalizedQuery ? { q: normalizedQuery } : {}),
    category: categoryFilter,
    page: String(Math.max(currentPage - 1, 1))
  }).toString()}`;
  const nextPageHref = `/inventory?${new URLSearchParams({
    ...(normalizedQuery ? { q: normalizedQuery } : {}),
    category: categoryFilter,
    page: String(Math.min(currentPage + 1, totalPages))
  }).toString()}`;

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-stone-950 shadow-2xl shadow-stone-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.38),transparent_22rem),radial-gradient(circle_at_84%_18%,rgba(16,185,129,0.24),transparent_20rem),radial-gradient(circle_at_62%_94%,rgba(217,119,6,0.18),transparent_18rem)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-stone-950 shadow-xl shadow-black/20">
                    <Boxes aria-hidden="true" className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">
                      Stock control
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                      Inventory
                    </h1>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  Track rolls, boxes, suiting, readymade, and accessories in separate focused
                  listings.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 lg:min-w-[42rem]">
                {[
                  {
                    icon: Banknote,
                    label: "Total inventory",
                    value: formatCurrency(totalInventoryCost),
                    tone: "bg-amber-300/15 text-amber-100"
                  },
                  {
                    icon: Layers3,
                    label: "Category cost",
                    value: formatCurrency(categoryStockValue),
                    tone: "bg-emerald-300/15 text-emerald-100"
                  },
                  {
                    icon: Tags,
                    label: "Items",
                    value: products.length,
                    tone: "bg-orange-300/15 text-orange-100"
                  },
                  {
                    icon: Ruler,
                    label: "Quantity",
                    value: formatQuantity(categoryQuantity, activeCategory?.unit ?? "unit"),
                    tone: "bg-lime-300/15 text-lime-100"
                  },
                  {
                    icon: AlertTriangle,
                    label: "Low stock",
                    value: categoryLowStockCount,
                    tone: "bg-rose-400/15 text-rose-100"
                  }
                ].map((stat) => {
                  const Icon = stat.icon;

                  return (
                    <div
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white shadow-sm backdrop-blur"
                      key={stat.label}
                    >
                      <div
                        className={`mb-3 flex size-8 items-center justify-center rounded-xl ${stat.tone}`}
                      >
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

        <StatusAlert message={statusMessage} />

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/80 shadow-sm backdrop-blur">
              <div className="border-b border-slate-100 bg-gradient-to-br from-white to-teal-50/50 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Inventory listings</h2>
                    <p className="text-sm text-slate-500">
                      Showing {products.length} of {productCount} matching items
                    </p>
                  </div>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                    Internal codes
                  </span>
                </div>

                <form className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]" action="/inventory">
                  <label className="relative">
                    <Search
                      aria-hidden="true"
                      className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                      defaultValue={normalizedQuery}
                      name="q"
                      placeholder="Search name, code, color, fabric"
                    />
                  </label>
                  <PendingSubmitButton
                    className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                    pendingText="Searching..."
                  >
                    Search
                  </PendingSubmitButton>
                </form>

                <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm font-semibold">
                  {inventoryCategories.map((category) => {
                    const isActive = category.value === categoryFilter;
                    const CategoryIcon = category.icon;
                    const href = `/inventory?${new URLSearchParams({
                      ...(normalizedQuery ? { q: normalizedQuery } : {}),
                      category: category.value,
                      page: "1"
                    }).toString()}`;

                    return (
                      <a
                        className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 transition ${
                          isActive
                            ? "bg-slate-950 text-white shadow-sm"
                            : "border border-white bg-white/80 text-slate-600 shadow-sm hover:bg-teal-50 hover:text-teal-800"
                        }`}
                        href={href}
                        key={category.value}
                      >
                        <CategoryIcon aria-hidden="true" className="size-4" />
                        {category.label}
                      </a>
                    );
                  })}
                </nav>
              </div>

              <div className="divide-y divide-slate-100">
                {products.length ? (
                  productsByCategory
                    .filter((category) => category.products.length)
                    .map((category) => {
                      const CategoryIcon = category.icon;

                      return (
                        <section className="p-5" key={category.value}>
                          <div
                            className={`mb-3 rounded-2xl border ${category.border} bg-gradient-to-br ${category.panel} px-4 py-3`}
                          >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`flex size-8 items-center justify-center rounded-xl ${category.tone}`}>
                                <CategoryIcon aria-hidden="true" className="size-4" />
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${category.tone}`}
                              >
                                {category.label}
                              </span>
                              <span className="text-xs font-medium text-slate-400">
                                {category.products.length} items
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{category.description}</p>
                          </div>
                        </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-100">
                          {category.products.map((product) => (
                            <div className="border-b border-slate-100 bg-white/90 last:border-b-0" key={product.id}>
                              <div
                                className="grid gap-4 px-4 py-3 transition hover:bg-teal-50/40 lg:grid-cols-[minmax(0,1.4fr)_10rem_8rem_8rem_6.5rem]"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-sm font-semibold text-slate-950">
                                      {product.name}
                                    </h3>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                      {typeLabels[product.type]}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {product.sku || "No code"} - {product.fabricType || "No fabric"} -{" "}
                                    {product.color || "No color"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-medium text-slate-400">On hand</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-950">
                                    {formatQuantity(product.quantityOnHand, product.unit)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-medium text-slate-400">Cost</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-950">
                                    {formatCurrency(product.costPrice)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-medium text-slate-400">Sale</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-950">
                                    {formatCurrency(product.sellingPrice)}
                                  </p>
                                </div>

                                <div className="flex items-start lg:justify-end">
                                  <form action={deleteInventoryItem}>
                                    <input name="productId" type="hidden" value={product.id} />
                                    <PendingSubmitButton
                                      className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                      pendingText={`Deleting ${product.name}`}
                                      spinnerOnly
                                      title="Archive or delete wrong entry"
                                    >
                                      <Trash2 aria-hidden="true" className="size-4" />
                                      <span className="sr-only">Archive or delete {product.name}</span>
                                    </PendingSubmitButton>
                                  </form>
                                </div>
                              </div>

                              <details className="group px-4 pb-3">
                                <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">
                                  <Pencil aria-hidden="true" className="size-4" />
                                  Edit details
                                  <span className="ml-auto text-xs text-indigo-500 group-open:hidden">
                                    Open
                                  </span>
                                  <span className="ml-auto hidden text-xs text-slate-500 group-open:inline">
                                    Close
                                  </span>
                                </summary>
                                <form
                                  action={updateInventoryItem}
                                  className="mt-3 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
                                >
                                  <input name="productId" type="hidden" value={product.id} />
                                  <input
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                    defaultValue={product.name}
                                    name="name"
                                    placeholder="Item name"
                                    required
                                  />
                                  <select
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                    defaultValue={product.category}
                                    name="category"
                                  >
                                    {inventoryCategories.map((inventoryCategory) => (
                                      <option
                                        key={inventoryCategory.value}
                                        value={inventoryCategory.value}
                                      >
                                        {inventoryCategory.label}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                    defaultValue={product.sku ?? ""}
                                    name="sku"
                                    placeholder="Internal code"
                                  />
                                  <input
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                    defaultValue={product.unit}
                                    name="unit"
                                    placeholder="Unit"
                                  />
                                  <input
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                    defaultValue={product.fabricType ?? ""}
                                    name="fabricType"
                                    placeholder="Fabric"
                                  />
                                  <input
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                    defaultValue={product.color ?? ""}
                                    name="color"
                                    placeholder="Color"
                                  />
                                  <input
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                    defaultValue={asNumber(product.costPrice)}
                                    min="0"
                                    name="costPrice"
                                    placeholder="Cost / unit"
                                    step="0.01"
                                    type="number"
                                  />
                                  <input
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400"
                                    defaultValue={asNumber(product.sellingPrice)}
                                    min="0"
                                    name="sellingPrice"
                                    placeholder="Sale / unit"
                                    step="0.01"
                                    type="number"
                                  />
                                  <p className="text-xs leading-5 text-slate-500 md:col-span-2 xl:col-span-3">
                                    Quantity is changed from Update stock so the movement history
                                    stays accurate.
                                  </p>
                                  <PendingSubmitButton
                                    className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    pendingText="Saving..."
                                  >
                                    Save changes
                                  </PendingSubmitButton>
                                </form>
                              </details>
                            </div>
                          ))}
                        </div>
                        </section>
                      );
                    })
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm font-semibold text-slate-950">No inventory items found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add your first fabric roll or readymade item to start tracking stock.
                    </p>
                  </div>
                )}
              </div>

              {productCount > pageSize ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-sm">
                  <p className="font-medium text-slate-500">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <a
                      aria-disabled={currentPage <= 1}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                        currentPage <= 1
                          ? "pointer-events-none bg-slate-100 text-slate-400"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                      href={previousPageHref}
                    >
                      Previous
                    </a>
                    <a
                      aria-disabled={currentPage >= totalPages}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                        currentPage >= totalPages
                          ? "pointer-events-none bg-slate-100 text-slate-400"
                          : "bg-slate-950 text-white"
                      }`}
                      href={nextPageHref}
                    >
                      Next
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-4">
            <details className="group rounded-3xl border border-teal-100/80 bg-gradient-to-br from-white to-teal-50/60 p-4 shadow-sm backdrop-blur sm:p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
                    <PackagePlus aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-950">
                      Add stock item
                    </span>
                    <span className="block text-xs text-slate-500">
                      New item or restock by internal code
                    </span>
                  </span>
                </span>
                <span className="text-sm font-semibold text-teal-700 group-open:hidden">Open</span>
                <span className="hidden text-sm font-semibold text-slate-500 group-open:inline">
                  Close
                </span>
              </summary>

              <form action={createInventoryItem} className="mt-5 grid gap-3">
                <input
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                  name="name"
                  placeholder="Item name"
                  required
                />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <select
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                    defaultValue="UNSTITCHED_ROLLS"
                    name="category"
                  >
                    {inventoryCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                    name="sku"
                    placeholder="Existing code to restock"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                    min="0"
                    name="quantity"
                    placeholder="Opening quantity"
                    step="0.01"
                    type="number"
                  />
                  <input
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                    name="unit"
                    placeholder="Unit sold as"
                  />
                </div>
                <p className="-mt-1 text-xs leading-5 text-slate-500">
                  If this code already exists, the quantity is added to that item instead of
                  creating a duplicate.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                    name="fabricType"
                    placeholder="Fabric"
                  />
                  <input
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                    name="color"
                    placeholder="Color"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                    min="0"
                    name="costPrice"
                    placeholder="Cost / unit"
                    step="0.01"
                    type="number"
                  />
                  <input
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                    min="0"
                    name="sellingPrice"
                    placeholder="Sale price / unit"
                    step="0.01"
                    type="number"
                  />
                </div>
                <p className="-mt-1 text-xs leading-5 text-slate-500">
                  For boxes, enter the cost and sale price for one complete box. For rolls, enter
                  the price per meter.
                </p>
                <PendingSubmitButton
                  className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  pendingText="Adding..."
                >
                  Add item
                </PendingSubmitButton>
              </form>
            </details>

            <details className="group rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-white to-indigo-50/60 p-4 shadow-sm backdrop-blur sm:p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-indigo-700 shadow-sm">
                    <SlidersHorizontal aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-950">
                      Update stock
                    </span>
                    <span className="block text-xs text-slate-500">In, out, return, adjust</span>
                  </span>
                </span>
                <span className="text-sm font-semibold text-indigo-700 group-open:hidden">
                  Open
                </span>
                <span className="hidden text-sm font-semibold text-slate-500 group-open:inline">
                  Close
                </span>
              </summary>

              <form action={recordInventoryMovement} className="mt-5 grid gap-3">
                <select
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                  name="productId"
                  required
                >
                  <option value="">Select item</option>
                  {movementProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku || "no code"})
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                    name="type"
                  >
                    {movementOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                    min="0.01"
                    name="quantity"
                    placeholder="Qty"
                    required
                    step="0.01"
                    type="number"
                  />
                </div>
                <input
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-teal-400"
                  name="note"
                  placeholder="Note"
                />
                <PendingSubmitButton
                  className="h-11 rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                  pendingText="Saving..."
                >
                  Save movement
                </PendingSubmitButton>
              </form>
            </details>

            <section className="rounded-3xl border border-slate-100/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm backdrop-blur sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <ClipboardList aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Recent movements</h2>
                  <p className="text-xs text-slate-500">Latest stock changes</p>
                </div>
              </div>

              <div className="mt-4 divide-y divide-slate-100">
                {recentMovements.length ? (
                  recentMovements.map((movement) => {
                    const isNegative = asNumber(movement.quantity) < 0;
                    const DirectionIcon = isNegative ? ArrowDown : ArrowUp;

                    return (
                      <div className="flex items-start gap-3 py-3" key={movement.id}>
                        <span
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${
                            isNegative ? "bg-rose-50 text-rose-700" : "bg-teal-50 text-teal-700"
                          }`}
                        >
                          <DirectionIcon aria-hidden="true" className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {movement.product.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {movement.product.sku || "No code"} - {movement.note || movement.type}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs font-semibold text-slate-700">
                          {formatQuantity(movement.quantity, movement.product.unit)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-3 text-sm text-slate-500">No stock movements yet.</p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
