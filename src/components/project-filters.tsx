"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";

export type FilterValue = "all" | "with_icp" | "without_icp";
export type SortValue = "newest" | "oldest" | "name_asc" | "name_desc";

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "with_icp", label: "Con ICP" },
  { value: "without_icp", label: "Sin ICP" },
];

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "newest", label: "Más reciente" },
  { value: "oldest", label: "Más antiguo" },
  { value: "name_asc", label: "Nombre A→Z" },
  { value: "name_desc", label: "Nombre Z→A" },
];

interface ProjectFiltersProps {
  filter: FilterValue;
  sort: SortValue;
  total: number;
  shown: number;
}

export function ProjectFilters({ filter, sort, total, shown }: ProjectFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, value);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      {/* Left — filter pills */}
      <div className="flex items-center gap-1">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateParam("filter", opt.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === opt.value
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Right — sort select + count */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-400">
          {shown < total ? `${shown} de ${total}` : `${total}`} proyecto{total !== 1 ? "s" : ""}
        </span>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => updateParam("sort", e.target.value)}
            className="h-8 appearance-none rounded-md border border-zinc-200 bg-white pl-3 pr-7 text-xs font-medium text-zinc-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
