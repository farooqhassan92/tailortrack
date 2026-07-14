import { AppShell } from "@/components/layout/app-shell";

export default function Page() {
  return (
    <AppShell>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-950">Inventory</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Manage readymade items, unstitched fabric, stock levels, and inventory movements.
        </p>
      </div>
    </AppShell>
  );
}
