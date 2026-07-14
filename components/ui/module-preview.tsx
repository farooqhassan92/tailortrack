import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

type ModulePreviewProps = {
  title: string;
  description: string;
  eyebrow: string;
  icon: LucideIcon;
  features: string[];
  accent: string;
};

export function ModulePreview({
  title,
  description,
  eyebrow,
  icon: Icon,
  features,
  accent
}: ModulePreviewProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-xl shadow-slate-950/5 backdrop-blur">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_19rem] lg:items-end lg:p-8">
          <div>
            <div
              className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg shadow-slate-950/10`}
            >
              <Icon aria-hidden="true" className="size-6" />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              {description}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-slate-950 p-5 text-white shadow-xl shadow-slate-950/10">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-300">Workspace status</p>
              <span className="flex size-10 items-center justify-center rounded-2xl bg-white/10">
                <ArrowUpRight aria-hidden="true" className="size-5" />
              </span>
            </div>
            <p className="mt-5 text-2xl font-semibold">Ready to build</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This module is styled for responsive screens and prepared for the next data workflow.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map((feature, index) => (
          <div
            className="rounded-3xl border border-white/80 bg-white/75 p-5 shadow-sm backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/10"
            key={feature}
          >
            <span className="flex size-9 items-center justify-center rounded-2xl bg-teal-50 text-sm font-semibold text-teal-800">
              {index + 1}
            </span>
            <p className="mt-4 text-sm font-semibold text-slate-950">{feature}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
