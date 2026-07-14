import { AppShell } from "@/components/layout/app-shell";

export default function Page() {
  return (
    <AppShell>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-950">Salaries</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Calculate tailor salaries from completed stitching orders and item rates.
        </p>
      </div>
    </AppShell>
  );
}
