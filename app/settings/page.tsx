import { Building2, CheckCircle2, CircleAlert, FileText, MapPin, Phone, Save } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { getCurrentOrganization } from "@/lib/organization";

import { updateBusinessProfile } from "./actions";

export const dynamic = "force-dynamic";

const statusMessages = {
  "address-too-long": {
    text: "Business address must be 180 characters or less.",
    variant: "warning"
  },
  "city-too-long": {
    text: "City must be 60 characters or less.",
    variant: "warning"
  },
  "footer-too-long": {
    text: "Invoice footer must be 160 characters or less.",
    variant: "warning"
  },
  "invalid-name": {
    text: "Business or shop name must be at least 2 characters.",
    variant: "warning"
  },
  "invalid-phone": {
    text: "Enter a valid phone number using digits, spaces, +, -, or brackets.",
    variant: "warning"
  },
  "name-too-long": {
    text: "Business or shop name must be 80 characters or less.",
    variant: "warning"
  },
  updated: {
    text: "Business profile and document branding updated.",
    variant: "success"
  }
} as const;

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string | string[] }>;
}) {
  const organization = await getCurrentOrganization();
  const params = await searchParams;
  const status = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const statusMessage = getStatusMessage(statusMessages, status);
  const completionItems = [
    { complete: Boolean(organization.name.trim()), label: "Business name" },
    { complete: Boolean(organization.phone?.trim()), label: "Business phone" },
    { complete: Boolean(organization.address?.trim()), label: "Business address" },
    { complete: Boolean(organization.city?.trim()), label: "City" },
    { complete: Boolean(organization.invoiceFooter?.trim()), label: "Invoice footer" }
  ];
  const completedCount = completionItems.filter((item) => item.complete).length;

  return (
    <AppShell>
      <div className="space-y-5 sm:space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 shadow-2xl shadow-slate-950/10">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.34),transparent_22rem),radial-gradient(circle_at_86%_12%,rgba(14,165,233,0.22),transparent_20rem)]" />
            <div className="relative max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">
                Settings
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Business profile
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
                Keep shop details accurate so invoices, reports, and printed documents look
                professional for customers and management.
              </p>
            </div>
          </div>
        </section>

        <StatusAlert message={statusMessage} />

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <form
            action={updateBusinessProfile}
            className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-800">
                  Shop or business name
                </span>
                <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                  <Building2 aria-hidden="true" className="size-4 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm text-slate-950 outline-none"
                    defaultValue={organization.name}
                    maxLength={80}
                    minLength={2}
                    name="name"
                    required
                  />
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-800">Business phone</span>
                <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                  <Phone aria-hidden="true" className="size-4 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm text-slate-950 outline-none"
                    defaultValue={organization.phone ?? ""}
                    maxLength={24}
                    name="phone"
                    pattern="[+()\\-\\s0-9]{7,24}"
                    placeholder="0300 0000000"
                  />
                </span>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-800">City</span>
                <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                  <MapPin aria-hidden="true" className="size-4 text-slate-400" />
                  <input
                    className="w-full bg-transparent text-sm text-slate-950 outline-none"
                    defaultValue={organization.city ?? ""}
                    maxLength={60}
                    name="city"
                    placeholder="Lahore"
                  />
                </span>
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-800">Business address</span>
                <textarea
                  className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                  defaultValue={organization.address ?? ""}
                  maxLength={180}
                  name="address"
                  placeholder="Shop address"
                />
              </label>

              <label className="grid gap-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-800">Invoice footer</span>
                <textarea
                  className="min-h-20 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
                  defaultValue={organization.invoiceFooter ?? ""}
                  maxLength={160}
                  name="invoiceFooter"
                  placeholder="Thank you for your business."
                />
              </label>
            </div>

            <button
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
              type="submit"
            >
              <Save aria-hidden="true" className="size-4" />
              Save business profile
            </button>
          </form>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Profile completion</h2>
                  <p className="text-xs text-slate-500">
                    {completedCount} of {completionItems.length} branding fields complete
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                {completionItems.map((item) => {
                  const Icon = item.complete ? CheckCircle2 : CircleAlert;

                  return (
                    <div
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${
                        item.complete
                          ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                          : "border-amber-100 bg-amber-50 text-amber-800"
                      }`}
                      key={item.label}
                    >
                      <Icon aria-hidden="true" className="size-4" />
                      <span className="font-semibold">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <FileText aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Document preview</h2>
                  <p className="text-xs text-slate-500">Used on invoices and reports</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-lg font-semibold text-slate-950">{organization.name}</p>
                {organization.phone ? (
                  <p className="mt-2 text-sm text-slate-600">{organization.phone}</p>
                ) : null}
                {[organization.address, organization.city].filter(Boolean).length ? (
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {[organization.address, organization.city].filter(Boolean).join(", ")}
                  </p>
                ) : null}
                <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-500">
                  {organization.invoiceFooter || "Thank you for your business."}
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
