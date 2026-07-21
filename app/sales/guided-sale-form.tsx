"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  Calculator,
  CheckCircle2,
  CreditCard,
  ReceiptText,
  ShoppingBag,
  UserRound
} from "lucide-react";
import { useMemo, useState } from "react";

import { PendingSubmitButton } from "@/components/ui/pending-submit-button";

import { BillTotalPreview } from "./bill-total-preview";
import { createInventorySale } from "./actions";

type ProductOption = {
  id: string;
  name: string;
  price: number;
  quantityOnHand: number;
  unit: string;
};

type SelectedCustomer = {
  address: string | null;
  id: string;
  measurementCount: number;
  name: string;
  phone: string;
} | null;

type SaleType = "inventory" | "stitching" | "combined";

function formatCurrency(value: number) {
  return `Rs. ${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0
  }).format(value)}`;
}

function formatQuantity(value: number, unit: string) {
  return `${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 2
  }).format(value)} ${unit}`;
}

const steps = [
  { icon: UserRound, label: "Customer" },
  { icon: ShoppingBag, label: "Items" },
  { icon: CreditCard, label: "Payment" },
  { icon: ReceiptText, label: "Review" }
] as const;

export function GuidedSaleForm({
  products,
  selectedCustomer
}: {
  products: ProductOption[];
  selectedCustomer: SelectedCustomer;
}) {
  const [step, setStep] = useState(0);
  const [saleType, setSaleType] = useState<SaleType>("inventory");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [garmentType, setGarmentType] = useState("");
  const [stitchingCharge, setStitchingCharge] = useState("");
  const [discount, setDiscount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");

  const selectedProduct = products.find((product) => product.id === productId) ?? null;
  const inventorySubtotal =
    selectedProduct && Number(quantity) > 0 ? selectedProduct.price * Number(quantity) : 0;
  const stitchingSubtotal = Number(stitchingCharge) > 0 ? Number(stitchingCharge) : 0;
  const subtotal = inventorySubtotal + stitchingSubtotal;
  const safeDiscount = Math.min(Number(discount) || 0, subtotal);
  const total = Math.max(subtotal - safeDiscount, 0);
  const safePaid = Math.min(Number(paidAmount) || 0, total);
  const balance = Math.max(total - safePaid, 0);
  const canUseInventory = saleType === "inventory" || saleType === "combined";
  const canUseStitching = saleType === "stitching" || saleType === "combined";
  const stepWarnings = useMemo(() => {
    const warnings: Record<number, string[]> = {
      0: [],
      1: [],
      2: [],
      3: []
    };

    if (canUseStitching && !selectedCustomer) {
      warnings[0].push("Select a customer before creating stitching work.");
    }

    if (canUseStitching && selectedCustomer && selectedCustomer.measurementCount === 0) {
      warnings[0].push("Add customer measurements before creating stitching work.");
    }

    if (canUseInventory && (!selectedProduct || !(Number(quantity) > 0))) {
      warnings[1].push("Select an inventory item and quantity.");
    }

    if (selectedProduct && Number(quantity) > selectedProduct.quantityOnHand) {
      warnings[1].push("Quantity is higher than available stock.");
    }

    if (canUseStitching && (!garmentType || !(Number(stitchingCharge) > 0))) {
      warnings[1].push("Enter garment type and stitching charge.");
    }

    if (subtotal <= 0) {
      warnings[2].push("Add at least one billable item before payment.");
    }

    if (!selectedCustomer && balance > 0) {
      warnings[2].push("Walk-in customer must pay the full amount.");
    }

    warnings[3] = [...warnings[0], ...warnings[1], ...warnings[2]];

    return warnings;
  }, [
    balance,
    canUseInventory,
    canUseStitching,
    garmentType,
    quantity,
    selectedCustomer,
    selectedProduct,
    stitchingCharge,
    subtotal
  ]);
  const reviewWarnings = stepWarnings[3];
  const canContinue = stepWarnings[step].length === 0;

  return (
    <form action={createInventorySale} className="grid gap-5 p-5">
      <input name="customerId" type="hidden" value={selectedCustomer?.id ?? ""} />

      <div className="grid gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-2 sm:grid-cols-4">
        {steps.map((item, index) => {
          const Icon = item.icon;

          return (
            <button
              className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                step === index ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10" : "text-slate-600 hover:bg-white"
              }`}
              key={item.label}
              onClick={() => setStep(index)}
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {step === 0 ? (
        <section className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Step 1: Customer</h3>
          <p className="mt-1 text-sm text-slate-500">
            Use walk-in for fully paid inventory sales, or select a customer for stitching and balances.
          </p>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            {selectedCustomer ? (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{selectedCustomer.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedCustomer.phone}</p>
                  {selectedCustomer.address ? (
                    <p className="mt-1 text-xs text-slate-500">{selectedCustomer.address}</p>
                  ) : null}
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    selectedCustomer.measurementCount
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {selectedCustomer.measurementCount ? "Measurements available" : "Measurements missing"}
                </span>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-slate-950">Walk-in customer</p>
                <p className="mt-1 text-sm text-slate-500">
                  Walk-in invoices must be fully paid at creation.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white"
              href={"/sales" as Route}
            >
              Use walk-in
            </Link>
            <Link
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
              href={"/customers" as Route}
            >
              Add customer
            </Link>
            {selectedCustomer ? (
              <Link
                className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                href={`/measurements?q=${encodeURIComponent(selectedCustomer.phone)}` as Route}
              >
                Add measurements
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="grid gap-4">
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-950">Step 2: Sale type</h3>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { label: "Inventory", value: "inventory" },
                { label: "Stitching", value: "stitching" },
                { label: "Combined", value: "combined" }
              ].map((item) => (
                <button
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    saleType === item.value
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                  key={item.value}
                  onClick={() => setSaleType(item.value as SaleType)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {canUseInventory ? (
            <section className="rounded-3xl border border-sky-100 bg-sky-50/50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">Inventory item</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_14rem]">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Item
                  <select
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    name="productId"
                    onChange={(event) => setProductId(event.target.value)}
                    value={productId}
                  >
                    <option value="">No inventory item</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatQuantity(product.quantityOnHand, product.unit)} in stock -{" "}
                        {formatCurrency(product.price)} / {product.unit}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Quantity sold
                  <input
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    min="0.01"
                    name="quantity"
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="Qty"
                    step="0.01"
                    type="number"
                    value={quantity}
                  />
                </label>
              </div>
            </section>
          ) : null}

          {canUseStitching ? (
            <section className="rounded-3xl border border-violet-100 bg-violet-50/50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">Stitching service</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Garment type
                  <input
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    name="garmentType"
                    onChange={(event) => setGarmentType(event.target.value)}
                    placeholder="Shalwar kameez, suit, alteration"
                    value={garmentType}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Stitching charge
                  <input
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    min="0"
                    name="stitchingCharge"
                    onChange={(event) => setStitchingCharge(event.target.value)}
                    placeholder="0"
                    step="0.01"
                    type="number"
                    value={stitchingCharge}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Due date
                  <input
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    name="dueDate"
                    type="date"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                  Style notes
                  <input
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    name="styleNotes"
                    placeholder="Collar, cuffs, fitting notes"
                  />
                </label>
              </div>
            </section>
          ) : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Discount
            <input
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              min="0"
              name="discount"
              onChange={(event) => setDiscount(event.target.value)}
              placeholder="0"
              step="0.01"
              type="number"
              value={discount}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Paid amount
            <input
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              min="0"
              name="paidAmount"
              onChange={(event) => setPaidAmount(event.target.value)}
              placeholder="0"
              step="0.01"
              type="number"
              value={paidAmount}
            />
            <button
              className="mt-1 w-fit rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
              onClick={() => setPaidAmount(String(total))}
              type="button"
            >
              Mark fully paid
            </button>
            <span className="text-xs font-normal leading-5 text-slate-500">
              Walk-in sales must be fully paid. Select a customer to allow balance.
            </span>
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Payment method
            <select
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              name="paymentMethod"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Note
            <input
              className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              name="note"
              placeholder="Optional invoice note"
            />
          </label>

          <BillTotalPreview products={products} />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-4">
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                <Calculator aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Review invoice</h3>
                <p className="text-xs text-slate-500">Confirm the bill before creating it.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Subtotal", value: formatCurrency(subtotal) },
                { label: "Discount", value: `- ${formatCurrency(safeDiscount)}` },
                { label: "Total", value: formatCurrency(total) },
                { label: "Balance", value: formatCurrency(balance) }
              ].map((item) => (
                <div className="rounded-2xl border border-white bg-white/80 p-3" key={item.label}>
                  <p className="text-xs font-medium text-slate-500">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {reviewWarnings.length ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {reviewWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              Ready to create invoice.
            </div>
          )}
        </section>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
          type="button"
        >
          Back
        </button>
        {step < 3 ? (
          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canContinue}
            onClick={() => setStep((current) => Math.min(current + 1, 3))}
            type="button"
          >
            Continue
          </button>
        ) : (
          <PendingSubmitButton
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={reviewWarnings.length > 0}
            pendingText="Creating invoice..."
          >
            Create sale and print invoice
          </PendingSubmitButton>
        )}
      </div>
      {stepWarnings[step].length ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {stepWarnings[step].map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </form>
  );
}
