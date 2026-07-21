import { Building2, MapPin, Phone, Shirt } from "lucide-react";
import { redirect } from "next/navigation";

import { getStatusMessage, StatusAlert } from "@/components/ui/status-alert";
import { getSignedInUserProfile } from "@/lib/organization";
import { prisma } from "@/lib/prisma";

import { createBusinessProfile } from "./actions";

export const dynamic = "force-dynamic";

const statusMessages = {
  "missing-name": {
    text: "Business or shop name is required before you can continue.",
    variant: "warning"
  }
} as const;

export default async function BusinessProfilePage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string | string[] }>;
}) {
  const profile = await getSignedInUserProfile();
  const params = await searchParams;
  const status = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const statusMessage = getStatusMessage(statusMessages, status);

  const existingUser = await prisma.user.findUnique({
    include: {
      organizationMemberships: {
        where: {
          organization: {
            profileCompletedAt: {
              not: null
            }
          }
        },
        take: 1
      }
    },
    where: {
      email: profile.email
    }
  });

  if (existingUser?.organizationMemberships.length) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#f8fafc_0%,#eef6f6_52%,#f8fafc_100%)] px-4 py-10">
      <section className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_minmax(360px,430px)] lg:items-center">
        <div className="max-w-xl">
          <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
            <Shirt aria-hidden="true" className="size-5" />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            Business profile
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
            Set up your shop
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Create one business profile for your shop before using TailorTrack. These
            details will appear on invoices, customer statements, and reports.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/8">
          <StatusAlert message={statusMessage} />

          <form action={createBusinessProfile} className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">Shop or business name</span>
              <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-teal-400 focus-within:bg-white">
                <Building2 aria-hidden="true" className="size-4 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                  name="name"
                  placeholder="Al Noor Tailors"
                  required
                />
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">Business phone</span>
              <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-teal-400 focus-within:bg-white">
                <Phone aria-hidden="true" className="size-4 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                  name="phone"
                  placeholder="0300 0000000"
                />
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">City</span>
              <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-teal-400 focus-within:bg-white">
                <MapPin aria-hidden="true" className="size-4 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                  name="city"
                  placeholder="Lahore"
                />
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-800">Business address</span>
              <textarea
                className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white"
                name="address"
                placeholder="Shop address"
              />
            </label>

            <button
              className="mt-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800"
              type="submit"
            >
              Create business profile
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
