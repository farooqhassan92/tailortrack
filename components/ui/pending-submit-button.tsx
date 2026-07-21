"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function PendingSubmitButton({
  children,
  className,
  disabled = false,
  pendingText
}: {
  children: React.ReactNode;
  className: string;
  disabled?: boolean;
  pendingText: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={disabled || pending} type="submit">
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
