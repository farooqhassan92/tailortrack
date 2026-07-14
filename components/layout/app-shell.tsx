"use client";

import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Ruler,
  Scissors,
  Shirt,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/inventory", icon: Boxes, label: "Inventory" },
  { href: "/sales", icon: CreditCard, label: "Sales" },
  { href: "/customers", icon: Users, label: "Customers" },
  { href: "/measurements", icon: Ruler, label: "Measurements" },
  { href: "/stitching-orders", icon: ClipboardList, label: "Stitching Orders" },
  { href: "/tailors", icon: Scissors, label: "Tailors" },
  { href: "/salaries", icon: ChartNoAxesCombined, label: "Salaries" }
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-100 p-5">
            <Link className="flex items-center gap-3" href="/dashboard">
              <span className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white">
                <Shirt aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block text-lg font-semibold text-slate-950">TailorTrack</span>
                <span className="block text-xs font-medium text-slate-500">Shop management</span>
              </span>
            </Link>
          </div>

          <nav className="grid gap-1 p-4 text-sm font-medium text-slate-600">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "hover:bg-slate-100 hover:text-slate-950"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-100 p-5">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Today&apos;s Focus</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Keep inventory, sales, and stitching work updated as orders move.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <section className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur lg:hidden">
          <Link className="flex items-center gap-3" href="/dashboard">
            <span className="flex size-9 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Shirt aria-hidden="true" className="size-4" />
            </span>
            <span className="text-lg font-semibold text-slate-950">TailorTrack</span>
          </Link>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm font-medium text-slate-600">
          {navigation.map((item) => (
            <Link
              className={`shrink-0 rounded-md border px-3 py-2 ${
                pathname === item.href
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-950"
              }`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        </header>
        <div className="mx-auto max-w-7xl p-5 sm:p-8">{children}</div>
      </section>
    </main>
  );
}
