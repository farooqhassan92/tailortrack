import { AppShell } from "@/components/layout/app-shell";

export default function Page() {
  return (
    <AppShell>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-950">Sales</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Create sales, invoices, payments, and track daily shop revenue.
        </p>
      </div>
    </AppShell>
  );
}
