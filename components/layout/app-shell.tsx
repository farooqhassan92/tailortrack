"use client";

import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Menu,
  Ruler,
  Scissors,
  Shirt,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    iconTone: "bg-teal-50 text-teal-700 group-hover:bg-teal-100 group-hover:text-teal-800"
  },
  {
    href: "/inventory",
    icon: Boxes,
    label: "Inventory",
    iconTone: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 group-hover:text-emerald-800"
  },
  {
    href: "/sales",
    icon: CreditCard,
    label: "Sales",
    iconTone: "bg-sky-50 text-sky-700 group-hover:bg-sky-100 group-hover:text-sky-800"
  },
  {
    href: "/customers",
    icon: Users,
    label: "Customers",
    iconTone: "bg-violet-50 text-violet-700 group-hover:bg-violet-100 group-hover:text-violet-800"
  },
  {
    href: "/measurements",
    icon: Ruler,
    label: "Measurements",
    iconTone: "bg-amber-50 text-amber-700 group-hover:bg-amber-100 group-hover:text-amber-800"
  },
  {
    href: "/stitching-orders",
    icon: ClipboardList,
    label: "Stitching Orders",
    iconTone: "bg-rose-50 text-rose-700 group-hover:bg-rose-100 group-hover:text-rose-800"
  },
  {
    href: "/tailors",
    icon: Scissors,
    label: "Tailors",
    iconTone: "bg-fuchsia-50 text-fuchsia-700 group-hover:bg-fuchsia-100 group-hover:text-fuchsia-800"
  },
  {
    href: "/salaries",
    icon: ChartNoAxesCombined,
    label: "Salaries",
    iconTone: "bg-indigo-50 text-indigo-700 group-hover:bg-indigo-100 group-hover:text-indigo-800"
  }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_28rem),radial-gradient(circle_at_top_right,rgba(244,114,182,0.13),transparent_24rem),linear-gradient(135deg,#f8fafc_0%,#eef4f8_46%,#f8fafc_100%)]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 overflow-hidden border-r border-white/80 bg-white/80 text-slate-800 shadow-[18px_0_70px_rgba(15,23,42,0.09)] backdrop-blur-2xl lg:block">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_7%,rgba(20,184,166,0.2),transparent_15rem),radial-gradient(circle_at_92%_22%,rgba(244,114,182,0.16),transparent_14rem),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.7)_48%,rgba(236,253,245,0.52))]" />
        <div className="relative flex h-full flex-col">
          <div className="border-b border-white/80 p-5">
            <Link className="flex items-center gap-3" href="/dashboard">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-950/15">
                <Shirt aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block text-lg font-semibold text-slate-950">TailorTrack</span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">
                  Shop studio
                </span>
              </span>
            </Link>
          </div>

          <nav className="grid gap-1.5 p-4 text-sm font-medium text-slate-600">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition duration-200 ${
                    isActive
                      ? "bg-slate-950 text-white shadow-xl shadow-slate-950/15"
                      : "hover:bg-white/80 hover:text-slate-950 hover:shadow-sm"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <span
                    className={`flex size-8 items-center justify-center rounded-xl transition ${
                      isActive
                        ? "bg-white/15 text-white"
                        : `${item.iconTone} shadow-sm`
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-white/80 p-5">
            <div className="rounded-3xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
              <p className="text-sm font-semibold text-slate-950">Today&apos;s Focus</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Keep inventory, sales, and stitching work updated as orders move.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 px-4 py-3 shadow-sm shadow-slate-950/5 backdrop-blur-2xl sm:px-5 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link className="flex min-w-0 items-center gap-3" href="/dashboard">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20">
                <Shirt aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold text-slate-950">
                  TailorTrack
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                  Studio
                </span>
              </span>
            </Link>
            <span className="flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
              <Menu aria-hidden="true" className="size-5" />
            </span>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm font-semibold text-slate-600">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 transition ${
                    pathname === item.href
                      ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                      : "border-white bg-white/80 hover:border-teal-100 hover:bg-teal-50 hover:text-teal-800"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-6 xl:p-8">{children}</div>
      </section>
    </main>
  );
}
