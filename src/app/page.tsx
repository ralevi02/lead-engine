import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewProjectDialog } from "@/components/new-project-dialog";
import type { Project } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic"; // always fetch fresh data

export default async function HomePage() {
  const allProjects: Project[] = await db
    .select()
    .from(projects)
    .orderBy(desc(projects.createdAt));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ── Header ── */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
              <span className="text-sm font-bold text-white dark:text-zinc-900">L</span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              LeadEngine
            </span>
          </div>
          <NewProjectDialog>
            <Button size="sm">+ Nuevo Proyecto</Button>
          </NewProjectDialog>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* ── Page title ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mis Proyectos
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {allProjects.length === 0
              ? "Aún no tienes proyectos."
              : `${allProjects.length} proyecto${allProjects.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* ── Summary metrics ── */}
        {allProjects.length > 0 && (
          <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Proyectos", value: allProjects.length },
              {
                label: "Con ICP generado",
                value: allProjects.filter((p) => p.icpDescription).length,
              },
              { label: "Leads generados", value: 0 },
              { label: "Contactados", value: 0 },
            ].map(({ label, value }) => (
              <Card key={label} className="py-4">
                <CardContent className="px-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {label}
                  </p>
                  <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                    {value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Projects grid ── */}
        {allProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-24 text-center dark:border-zinc-700">
            <p className="text-lg font-medium text-zinc-500">
              Aún no tienes proyectos
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Haz clic en &quot;Nuevo Proyecto&quot; para comenzar.
            </p>
            <div className="mt-6">
              <NewProjectDialog>
                <Button>+ Nuevo Proyecto</Button>
              </NewProjectDialog>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allProjects.map((project) => (
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

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{project.name}</CardTitle>
          <span
            className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
              hasIcp
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-amber-100 text-amber-700 border-amber-200"
            }`}
          >
            {hasIcp ? "ICP listo" : "Borrador"}
          </span>
        </div>
        <CardDescription className="truncate text-xs">{project.sourceUrl}</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            0 leads
          </Badge>
          <span className="text-xs text-zinc-400">
            {project.createdAt.toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        {project.icpDescription && (
          <p className="mt-3 line-clamp-2 text-xs text-zinc-500">
            {project.icpDescription.slice(0, 120)}…
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Link href={`/projects/${project.id}`} className="w-full">
          <Button variant="outline" size="sm" className="w-full">
            Ver Detalle →
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
