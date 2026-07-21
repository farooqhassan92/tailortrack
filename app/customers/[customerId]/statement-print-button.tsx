"use client";

import { Printer } from "lucide-react";

export function StatementPrintButton() {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-slate-100"
      onClick={() => window.print()}
      type="button"
    >
      <Printer aria-hidden="true" className="size-3.5" />
      Print statement
    </button>
  );
}
