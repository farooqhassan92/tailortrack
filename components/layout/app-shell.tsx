import Link from "next/link";

const navigation = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/sales", label: "Sales" },
  { href: "/customers", label: "Customers" },
  { href: "/measurements", label: "Measurements" },
  { href: "/stitching-orders", label: "Stitching Orders" },
  { href: "/tailors", label: "Tailors" },
  { href: "/salaries", label: "Salaries" }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-5 lg:block">
        <Link className="text-xl font-semibold text-slate-950" href="/dashboard">
          TailorTrack
        </Link>
        <nav className="mt-8 grid gap-1 text-sm text-slate-600">
          {navigation.map((item) => (
            <Link
              className="rounded-md px-3 py-2 hover:bg-slate-100 hover:text-slate-950"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <section className="lg:pl-64">
        <header className="border-b border-slate-200 bg-white px-5 py-4 lg:hidden">
          <Link className="text-lg font-semibold text-slate-950" href="/dashboard">
            TailorTrack
          </Link>
        </header>
        <div className="p-5 sm:p-8">{children}</div>
      </section>
    </main>
  );
}
