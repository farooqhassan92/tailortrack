"use client";

import { Search, X } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

type SearchResult = {
  href: string;
  label: string;
  meta: string | null;
  type: string;
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isSearchActive = query.trim().length >= 2;

  useEffect(() => {
    if (!isSearchActive) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
        signal: controller.signal
      })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((data: { results: SearchResult[] }) => setResults(data.results))
        .catch(() => setResults([]))
        .finally(() => setIsLoading(false));
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isSearchActive, query]);

  return (
    <div className="relative">
      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2.5 text-sm shadow-sm transition focus-within:border-teal-300 focus-within:ring-4 focus-within:ring-teal-100">
        <Search aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
        <input
          className="min-w-0 flex-1 bg-transparent text-slate-950 outline-none placeholder:text-slate-400"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customers, invoices, orders..."
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear search"
            className="text-slate-400 transition hover:text-slate-700"
            onClick={() => setQuery("")}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </label>

      {isSearchActive ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/12">
          {isLoading ? <p className="px-4 py-3 text-sm text-slate-500">Searching...</p> : null}
          {!isLoading && results.length ? (
            <div className="max-h-80 overflow-y-auto py-2">
              {results.map((result, index) => (
                <Link
                  className="block px-4 py-3 transition hover:bg-slate-50"
                  href={result.href as Route}
                  key={`${result.type}-${result.href}-${index}`}
                  onClick={() => setQuery("")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {result.label}
                      </p>
                      {result.meta ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{result.meta}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {result.type}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
          {!isLoading && !results.length ? (
            <p className="px-4 py-3 text-sm text-slate-500">No matching records found.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
