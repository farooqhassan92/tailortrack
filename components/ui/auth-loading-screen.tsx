import { Loader2, Shirt } from "lucide-react";

export function AuthLoadingScreen({
  message = "Preparing your workspace..."
}: {
  message?: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(135deg,#f8fafc_0%,#eef6f6_52%,#f8fafc_100%)] px-4 py-10">
      <section className="w-full max-w-sm rounded-3xl border border-white/80 bg-white/90 p-6 text-center shadow-xl shadow-slate-950/10 backdrop-blur">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15">
          <Shirt aria-hidden="true" className="size-6" />
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
          <Loader2 aria-hidden="true" className="size-4 animate-spin text-teal-700" />
          {message}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          TailorTrack is checking your secure session and shop profile.
        </p>
      </section>
    </main>
  );
}
