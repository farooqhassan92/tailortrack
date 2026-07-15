"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";

export function InvoicePrintButton({ autoPrint = false }: { autoPrint?: boolean }) {
  useEffect(() => {
    if (!autoPrint) {
      return;
    }

    const timeout = window.setTimeout(() => {
      window.print();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [autoPrint]);

  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition hover:bg-emerald-50"
      onClick={() => window.print()}
      type="button"
    >
      <Printer aria-hidden="true" className="size-4" />
      Print invoice
    </button>
  );
}
