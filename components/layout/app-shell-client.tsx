"use client";

import { UserButton } from "@clerk/nextjs";
import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Loader2,
  Menu,
  PackageCheck,
  ReceiptText,
  Ruler,
  Scissors,
  Settings,
  Shirt,
  Users,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { GlobalSearch } from "@/components/search/global-search";

export type BusinessProfile = {
  city: string | null;
  name: string;
  phone: string | null;
};

const navigation = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    iconTone: "bg-teal-50 text-teal-700 group-hover:bg-teal-100 group-hover:text-teal-800"
  },
  {
    href: "/production",
    icon: PackageCheck,
    label: "Production",
    iconTone: "bg-cyan-50 text-cyan-700 group-hover:bg-cyan-100 group-hover:text-cyan-800"
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
    href: "/invoices",
    icon: ReceiptText,
    label: "Invoices",
    iconTone: "bg-cyan-50 text-cyan-700 group-hover:bg-cyan-100 group-hover:text-cyan-800"
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
  },
  {
    href: "/expenses",
    icon: WalletCards,
    label: "Expenses",
    iconTone: "bg-rose-50 text-rose-700 group-hover:bg-rose-100 group-hover:text-rose-800"
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
    iconTone: "bg-slate-100 text-slate-700 group-hover:bg-slate-200 group-hover:text-slate-900"
  }
] as const;

export function AppShellClient({
  businessProfile,
  children
}: {
  businessProfile: BusinessProfile;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const businessMeta = [businessProfile.city, businessProfile.phone].filter(Boolean).join(" | ");
  const routeKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setIsNavigating(false), 0);

    return () => window.clearTimeout(timeoutId);
  }, [routeKey]);

  useEffect(() => {
    if (!isNavigating) {
      return;
    }

    const timeoutId = window.setTimeout(() => setIsNavigating(false), 8000);

    return () => window.clearTimeout(timeoutId);
  }, [isNavigating]);

  function showRouteLoader(href: string, event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0 ||
      href === pathname
    ) {
      return;
    }

    setIsNavigating(true);
  }

  function showSubmitLoader(event: FormEvent<HTMLElement>) {
    const form = event.target instanceof HTMLFormElement ? event.target : null;

    if (!form || form.target === "_blank") {
      return;
    }

    setIsNavigating(true);
  }

  function showInternalLinkLoader(event: MouseEvent<HTMLElement>) {
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    const target = event.target instanceof Element ? event.target.closest("a[href]") : null;

    if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || target.hasAttribute("download")) {
      return;
    }

    const nextUrl = new URL(target.href, window.location.href);

    if (
      nextUrl.origin !== window.location.origin ||
      `${nextUrl.pathname}?${nextUrl.searchParams.toString()}` === routeKey
    ) {
      return;
    }

    setIsNavigating(true);
  }

  return (
    <main
      className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.16),transparent_28rem),radial-gradient(circle_at_top_right,rgba(244,114,182,0.13),transparent_24rem),linear-gradient(135deg,#f8fafc_0%,#eef4f8_46%,#f8fafc_100%)] print:bg-white"
      onClickCapture={showInternalLinkLoader}
      onSubmitCapture={showSubmitLoader}
    >
      {isNavigating ? (
        <div
          aria-live="polite"
          className="no-print fixed inset-x-0 top-0 z-50 pointer-events-none"
          role="status"
        >
          <div className="h-1 w-full overflow-hidden bg-slate-200/70">
            <div className="h-full w-1/3 animate-[route-progress_1.1s_ease-in-out_infinite] rounded-full bg-slate-950 shadow-lg shadow-slate-950/20" />
          </div>
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-700 shadow-xl shadow-slate-950/10 backdrop-blur lg:right-6">
            <Loader2 aria-hidden="true" className="size-4 animate-spin text-teal-700" />
            Loading
          </div>
        </div>
      ) : null}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-72 overflow-hidden border-r border-white/80 bg-slate-50/90 text-slate-800 shadow-[18px_0_70px_rgba(15,23,42,0.09)] backdrop-blur-2xl lg:block">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(14,165,233,0.18),transparent_15rem),radial-gradient(circle_at_92%_24%,rgba(20,184,166,0.16),transparent_14rem),radial-gradient(circle_at_35%_78%,rgba(139,92,246,0.12),transparent_16rem),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.76)_48%,rgba(240,249,255,0.68))]" />
        <div className="relative flex h-full flex-col">
          <div className="border-b border-white/80 p-5">
            <Link
              className="flex items-center gap-3"
              href="/dashboard"
              onClick={(event) => showRouteLoader("/dashboard", event)}
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-teal-500 to-violet-600 text-white shadow-xl shadow-sky-900/20">
                <Shirt aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block truncate text-lg font-semibold text-slate-950">
                  {businessProfile.name}
                </span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                  {businessMeta || "TailorTrack"}
                </span>
              </span>
            </Link>
          </div>

          <div className="px-4 pt-4">
            <GlobalSearch />
          </div>

          <nav className="grid min-h-0 flex-1 gap-1.5 overflow-y-auto p-4 text-sm font-medium text-slate-600">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-slate-950 to-slate-800 text-white shadow-xl shadow-slate-950/15"
                      : "hover:bg-white/85 hover:text-slate-950 hover:shadow-sm"
                  }`}
                  href={item.href}
                  key={item.href}
                  onClick={(event) => showRouteLoader(item.href, event)}
                >
                  <span
                    className={`flex size-8 items-center justify-center rounded-xl transition ${
                      isActive ? "bg-white/15 text-white" : `${item.iconTone} shadow-sm`
                    }`}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="shrink-0 border-t border-white/80 bg-white/35 p-5 backdrop-blur">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <section className="lg:pl-72 print:pl-0">
        <header className="no-print sticky top-0 z-20 border-b border-white/70 bg-white/80 px-4 py-3 shadow-sm shadow-slate-950/5 backdrop-blur-2xl sm:px-5 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link
              className="flex min-w-0 items-center gap-3"
              href="/dashboard"
              onClick={(event) => showRouteLoader("/dashboard", event)}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20">
                <Shirt aria-hidden="true" className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-lg font-semibold text-slate-950">
                  {businessProfile.name}
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
                  {businessMeta || "TailorTrack"}
                </span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <UserButton />
              <LogoutButton compact />
              <span className="flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700">
                <Menu aria-hidden="true" className="size-5" />
              </span>
            </div>
          </div>
          <div className="mt-4">
            <GlobalSearch />
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 text-sm font-semibold text-slate-600">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 transition ${
                    isActive
                      ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                      : "border-white bg-white/80 hover:border-teal-100 hover:bg-teal-50 hover:text-teal-800"
                  }`}
                  href={item.href}
                  key={item.href}
                  onClick={(event) => showRouteLoader(item.href, event)}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-6 xl:p-8 print:max-w-none print:p-0">
          {children}
        </div>
      </section>
    </main>
  );
}
