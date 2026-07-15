import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X
} from "lucide-react";

export type StatusAlertVariant = "error" | "info" | "success" | "warning";

export type StatusAlertMessage = {
  text: string;
  title?: string;
  variant?: StatusAlertVariant;
};

const variants = {
  error: {
    icon: AlertCircle,
    styles: "border-rose-200 bg-rose-50 text-rose-900 shadow-rose-950/5",
    iconStyles: "bg-rose-100 text-rose-700"
  },
  info: {
    icon: Info,
    styles: "border-sky-200 bg-sky-50 text-sky-900 shadow-sky-950/5",
    iconStyles: "bg-sky-100 text-sky-700"
  },
  success: {
    icon: CheckCircle2,
    styles: "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-950/5",
    iconStyles: "bg-emerald-100 text-emerald-700"
  },
  warning: {
    icon: TriangleAlert,
    styles: "border-amber-200 bg-amber-50 text-amber-900 shadow-amber-950/5",
    iconStyles: "bg-amber-100 text-amber-700"
  }
} as const;

export function getStatusMessage<T extends Record<string, StatusAlertMessage | string>>(
  messages: T,
  status: string | string[] | undefined
): StatusAlertMessage | null {
  const value = Array.isArray(status) ? status[0] : status;

  if (!value || !(value in messages)) {
    return null;
  }

  const message = messages[value as keyof T];

  return typeof message === "string" ? { text: message } : message;
}

export function StatusAlert({ message }: { message: StatusAlertMessage | null }) {
  if (!message) {
    return null;
  }

  const variant = message.variant ?? "success";
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${config.styles}`}
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
    >
      <span
        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${config.iconStyles}`}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        {message.title ? <p className="font-semibold">{message.title}</p> : null}
        <p className={message.title ? "mt-0.5 text-current/80" : "font-semibold"}>
          {message.text}
        </p>
      </div>
      <X aria-hidden="true" className="mt-1 size-4 shrink-0 text-current/35" />
    </div>
  );
}
