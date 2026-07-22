"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  className,
  disabled = false,
  pendingText,
  spinnerOnly = false,
  ...buttonProps
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  className: string;
  pendingText?: string;
  spinnerOnly?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button {...buttonProps} className={className} disabled={disabled || pending} type="submit">
      {pending && spinnerOnly ? (
        <>
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          <span className="sr-only">{pendingText ?? "Loading..."}</span>
        </>
      ) : pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {pendingText ?? "Loading..."}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
