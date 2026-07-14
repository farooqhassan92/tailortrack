import { AppShell } from "@/components/layout/app-shell";

export default function Page() {
  return (
    <AppShell>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-2xl font-semibold text-slate-950">Tailors</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Manage tailor profiles, assigned work, completion records, and rates.
        </p>
      </div>
    </AppShell>
  );
}
