"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";

export function ReportPrintButton({ autoPrint = false }: { autoPrint?: boolean }) {
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
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10"
      onClick={() => window.print()}
      type="button"
    >
      <Printer aria-hidden="true" className="size-4" />
      Print / Save PDF
    </button>
  );
}
