import Link from "next/link";
import { desc, asc } from "drizzle-orm";
import { db, withRetry } from "@/db";
import { projects } from "@/db/schema";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { ProjectFilters } from "@/components/project-filters";
import type { Project } from "@/types";
import type { FilterValue, SortValue } from "@/components/project-filters";

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: Promise<{ filter?: string; sort?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { filter = "all", sort = "newest" } = await searchParams;

  const orderCol =
    sort === "name_asc" || sort === "name_desc"
      ? sort === "name_asc"
        ? asc(projects.name)
        : desc(projects.name)
      : sort === "oldest"
        ? asc(projects.createdAt)
        : desc(projects.createdAt);

  const allProjects: Project[] = await withRetry(() =>
    db.select().from(projects).orderBy(orderCol)
  );

  const withIcp = allProjects.filter((p) => p.icpDescription).length;

  const shown =
    filter === "with_icp"
      ? allProjects.filter((p) => p.icpDescription)
      : filter === "without_icp"
        ? allProjects.filter((p) => !p.icpDescription)
        : allProjects;

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Proyectos de Prospección
          </h1>
          <p className="text-xs text-zinc-500">
            {allProjects.length} proyecto{allProjects.length !== 1 ? "s" : ""}
            {withIcp > 0 ? ` · ${withIcp} con ICP` : ""}
          </p>
        </div>
        <NewProjectDialog>
          <button className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Proyecto
          </button>
        </NewProjectDialog>
      </header>

      <main className="flex-1 p-6">
        {/* ── Metric strip ── */}
        {allProjects.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total proyectos", value: allProjects.length, color: "text-zinc-900 dark:text-zinc-50" },
              { label: "Con ICP generado", value: withIcp, color: "text-emerald-600" },
              { label: "Sin ICP", value: allProjects.length - withIcp, color: "text-amber-600" },
              { label: "Tasa ICP", value: allProjects.length > 0 ? `${Math.round((withIcp / allProjects.length) * 100)}%` : "—", color: "text-blue-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
                <p className={`mt-1.5 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Filters (only when there are projects) ── */}
        {allProjects.length > 0 && (
          <ProjectFilters
            filter={(filter as FilterValue) ?? "all"}
            sort={(sort as SortValue) ?? "newest"}
            total={allProjects.length}
            shown={shown.length}
          />
        )}

        {/* ── Projects grid ── */}
        {allProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-28 text-center dark:border-zinc-800">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <svg className="h-6 w-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Sin proyectos todavía</p>
            <p className="mt-1 text-xs text-zinc-400">Crea tu primer proyecto para comenzar a prospectar</p>
            <div className="mt-5">
              <NewProjectDialog>
                <button className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Nuevo Proyecto
                </button>
              </NewProjectDialog>
            </div>
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Sin resultados para este filtro</p>
            <p className="mt-1 text-xs text-zinc-400">Prueba cambiando el filtro activo</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const hasIcp = Boolean(project.icpDescription);

  const keywordsMatch = project.icpDescription?.match(
    /Palabras clave de búsqueda:\s*(.+?)(?:\n|$)/
  );
  const keywords = keywordsMatch
    ? keywordsMatch[1].split(",").map((k) => k.trim()).filter(Boolean).slice(0, 3)
    : [];

  return (
    <Link href={`/projects/${project.id}`} className="group block">
      <div className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-700">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950 shrink-0">
            <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.64 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.55 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            hasIcp
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
          }`}>
            {hasIcp ? "ICP listo" : "Borrador"}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {project.name}
        </h3>
        <p className="truncate text-[11px] text-zinc-400 mb-3">{project.sourceUrl}</p>

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {keywords.map((kw) => (
              <span key={kw} className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-[11px] text-zinc-400">
            {project.createdAt.toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
            Ver detalle →
          </span>
        </div>
      </div>
    </Link>
  );
}
