"use client";

import { useClerk } from "@clerk/nextjs";
import { Loader2, LogOut } from "lucide-react";
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
        aria-label="Sign out"
        className="flex size-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleLogout}
        title="Sign out"
        type="button"
      >
        {isPending ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <LogOut aria-hidden="true" className="size-4" />
        )}
      </button>
    );
  }

  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-950/10 transition hover:border-rose-700 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={handleLogout}
      type="button"
    >
      {isPending ? (
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <LogOut aria-hidden="true" className="size-4" />
      )}
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
