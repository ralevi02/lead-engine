import Link from "next/link";
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
import type { Project } from "@/types";

// ─── Mock data ────────────────────────────────────────────────────────────────

type MockProject = Pick<Project, "id" | "name" | "sourceUrl" | "createdAt"> & {
  leadCount: number;
  status: "active" | "draft" | "completed";
};

const MOCK_PROJECTS: MockProject[] = [
  {
    id: "mock-1",
    name: "Getec Chile",
    sourceUrl: "getec.cl",
    leadCount: 48,
    status: "active",
    createdAt: new Date("2026-02-10"),
  },
  {
    id: "mock-2",
    name: "TechPyme Expansión",
    sourceUrl: "techpyme.com",
    leadCount: 32,
    status: "active",
    createdAt: new Date("2026-02-18"),
  },
  {
    id: "mock-3",
    name: "SaaS Latam Q1",
    sourceUrl: "saaslatam.io",
    leadCount: 15,
    status: "draft",
    createdAt: new Date("2026-02-24"),
  },
  {
    id: "mock-4",
    name: "Retail Santiago",
    sourceUrl: "retailsantiago.cl",
    leadCount: 91,
    status: "completed",
    createdAt: new Date("2026-01-30"),
  },
];

const STATUS_STYLES: Record<MockProject["status"], string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  draft: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const STATUS_LABELS: Record<MockProject["status"], string> = {
  active: "Activo",
  draft: "Borrador",
  completed: "Completado",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* ── Header ── */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
              <span className="text-sm font-bold text-white dark:text-zinc-900">
                L
              </span>
            </div>
            <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              LeadEngine
            </span>
          </div>
          <Button size="sm">+ Nuevo Proyecto</Button>
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
            {MOCK_PROJECTS.length} proyecto
            {MOCK_PROJECTS.length !== 1 ? "s" : ""} activos
          </p>
        </div>

        {/* ── Summary metrics ── */}
        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Proyectos", value: MOCK_PROJECTS.length },
            {
              label: "Leads generados",
              value: MOCK_PROJECTS.reduce((s, p) => s + p.leadCount, 0),
            },
            {
              label: "Activos",
              value: MOCK_PROJECTS.filter((p) => p.status === "active").length,
            },
            {
              label: "Completados",
              value: MOCK_PROJECTS.filter((p) => p.status === "completed")
                .length,
            },
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

        {/* ── Projects grid ── */}
        {MOCK_PROJECTS.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-24 text-center dark:border-zinc-700">
            <p className="text-lg font-medium text-zinc-500">
              Aún no tienes proyectos
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Haz clic en &quot;Nuevo Proyecto&quot; para comenzar.
            </p>
            <Button className="mt-6">+ Nuevo Proyecto</Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MOCK_PROJECTS.map((project) => (
              <Card
                key={project.id}
                className="flex flex-col transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">
                      {project.name}
                    </CardTitle>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}
                    >
                      {STATUS_LABELS[project.status]}
                    </span>
                  </div>
                  <CardDescription className="truncate text-xs">
                    {project.sourceUrl}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {project.leadCount} leads
                    </Badge>
                    <span className="text-xs text-zinc-400">
                      {project.createdAt.toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  <Link href={`/projects/${project.id}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver Detalle →
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
