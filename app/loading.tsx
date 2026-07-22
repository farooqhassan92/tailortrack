export default function Loading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f8fafc_0%,#eef4f8_46%,#f8fafc_100%)] lg:pl-72">
      <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 xl:p-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur sm:p-7 lg:p-8">
          <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-4 h-10 w-56 animate-pulse rounded-2xl bg-slate-200" />
          <div className="mt-4 h-4 max-w-xl animate-pulse rounded-full bg-slate-100" />
        </section>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-sm backdrop-blur"
              key={index}
            >
              <div className="size-11 animate-pulse rounded-2xl bg-slate-200" />
              <div className="mt-5 h-3 w-28 animate-pulse rounded-full bg-slate-100" />
              <div className="mt-3 h-7 w-20 animate-pulse rounded-xl bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
