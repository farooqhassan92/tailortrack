"use client";

import { Calculator, ReceiptText } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ProductOption = {
  id: string;
  name: string;
  price: number;
  unit: string;
};

type BillTotals = {
  inventorySubtotal: number;
  stitchingCharge: number;
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  balance: number;
};

function readNumber(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatCurrency(value: number) {
  return `Rs. ${new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0
  }).format(value)}`;
}

export function BillTotalPreview({ products }: { products: ProductOption[] }) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [totals, setTotals] = useState<BillTotals>({
    balance: 0,
    discount: 0,
    inventorySubtotal: 0,
    paidAmount: 0,
    stitchingCharge: 0,
    subtotal: 0,
    total: 0
  });

  useEffect(() => {
    const form = previewRef.current?.closest("form");

    if (!form) {
      return;
    }

    const calculateTotals = () => {
      const formData = new FormData(form);
      const productId = String(formData.get("productId") ?? "");
      const product = products.find((item) => item.id === productId) ?? null;
      const quantity = readNumber(formData, "quantity");
      const stitchingCharge = readNumber(formData, "stitchingCharge");
      const inventorySubtotal = product ? product.price * quantity : 0;
      const subtotal = inventorySubtotal + stitchingCharge;
      const discount = Math.min(readNumber(formData, "discount"), subtotal);
      const total = Math.max(subtotal - discount, 0);
      const paidAmount = Math.min(readNumber(formData, "paidAmount"), total);

      setSelectedProduct(product);
      setTotals({
        balance: Math.max(total - paidAmount, 0),
        discount,
        inventorySubtotal,
        paidAmount,
        stitchingCharge,
        subtotal,
        total
      });
    };

    calculateTotals();
    form.addEventListener("input", calculateTotals);
    form.addEventListener("change", calculateTotals);

    return () => {
      form.removeEventListener("input", calculateTotals);
      form.removeEventListener("change", calculateTotals);
    };
  }, [products]);

  return (
    <section
      className="overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-4 shadow-sm md:col-span-2"
      ref={previewRef}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
            <Calculator aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">Bill total</h3>
            <p className="text-xs text-slate-500">
              Updates automatically from item, stitching, discount, and paid amount.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white shadow-lg shadow-slate-950/10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Payable
          </p>
          <p className="mt-1 text-2xl font-semibold">{formatCurrency(totals.total)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: selectedProduct
              ? `${selectedProduct.name} subtotal`
              : "Inventory subtotal",
            value: formatCurrency(totals.inventorySubtotal)
          },
          {
            label: "Stitching charge",
            value: formatCurrency(totals.stitchingCharge)
          },
          {
            label: "Discount",
            value: `- ${formatCurrency(totals.discount)}`
          },
          {
            label: "Balance",
            value: formatCurrency(totals.balance)
          }
        ].map((item) => (
          <div className="rounded-2xl border border-white bg-white/80 p-3" key={item.label}>
            <p className="truncate text-xs font-medium text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-white/70 px-3 py-2 text-xs font-medium text-emerald-800">
        <ReceiptText aria-hidden="true" className="size-4 shrink-0" />
        <span>Subtotal {formatCurrency(totals.subtotal)} minus discount gives the final bill.</span>
      </div>
    </section>
  );
}
