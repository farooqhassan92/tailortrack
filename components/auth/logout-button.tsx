"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { useTransition } from "react";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const { signOut } = useClerk();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(() => {
      void signOut({ redirectUrl: "/sign-in" });
    });
  }

  if (compact) {
    return (
      <button
        aria-label="Logout"
        className="flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleLogout}
        title="Logout"
        type="button"
      >
        <LogOut aria-hidden="true" className="size-4" />
      </button>
    );
  }

  return (
    <button
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={handleLogout}
      type="button"
    >
      <LogOut aria-hidden="true" className="size-4" />
      {isPending ? "Logging out..." : "Logout"}
    </button>
  );
}
