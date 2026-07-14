import { AppShell } from "@/components/layout/app-shell";

const stats = [
  { label: "Today Sales", value: "Rs. 0" },
  { label: "Pending Stitching", value: "0" },
  { label: "Ready Orders", value: "0" },
  { label: "Tailor Salary Due", value: "Rs. 0" }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track shop sales, stitching orders, stock, and tailor work.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div className="rounded-lg border border-slate-200 bg-white p-5" key={stat.label}>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
