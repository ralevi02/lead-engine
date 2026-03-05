"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const NAV_MAIN = [
  {
    label: "Proyectos",
    href: "/",
    matchFn: (p: string) => p === "/" || p.startsWith("/projects"),
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
];

const NAV_SETTINGS = [
  {
    label: "Configuraciones",
    href: "/settings",
    matchFn: (p: string) => p.startsWith("/settings"),
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14M12 2v2m0 16v2M2 12h2m16 0h2" />
      </svg>
    ),
  },
];

function NavItem({ item, isActive }: {
  item: { label: string; href: string; icon: React.ReactNode };
  isActive: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-blue-600 text-white"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
      }`}
    >
      {item.icon}
      {item.label}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 shrink-0">
          <span className="text-xs font-bold text-white">L</span>
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
          LeadEngine
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 pt-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Principal
        </p>
        {NAV_MAIN.map((item) => (
          <NavItem key={item.href} item={item} isActive={item.matchFn(pathname)} />
        ))}

        <div className="my-3 border-t border-zinc-100 dark:border-zinc-800" />

        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Sistema
        </p>
        {NAV_SETTINGS.map((item) => (
          <NavItem key={item.href} item={item} isActive={item.matchFn(pathname)} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">v0.1.0 · Beta</span>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
