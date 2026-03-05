import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, withRetry } from "@/db";
import { projects, companies, contacts } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LeadDiscoveryForm } from "./lead-discovery-form";
import { LeadsTable } from "./leads-table";
import type { Contact, CompanyWithContacts } from "@/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;

  // Load project
  const [project] = await withRetry(() =>
    db.select().from(projects).where(eq(projects.id, id)).limit(1)
  );

  if (!project) notFound();

  // Load companies sorted by score descending
  const rawCompanies = await withRetry(() =>
    db
      .select()
      .from(companies)
      .where(eq(companies.projectId, id))
      .orderBy(desc(companies.matchScore))
  );

  // Load all contacts for these companies in one query
  const companyIds = rawCompanies.map((c) => c.id);
  const allContacts: Contact[] =
    companyIds.length > 0
      ? await withRetry(() =>
          db
            .select()
            .from(contacts)
            .where(inArray(contacts.companyId, companyIds))
        )
      : [];

  const contactsByCompany = allContacts.reduce<Record<string, Contact[]>>(
    (acc, c) => {
      if (!acc[c.companyId]) acc[c.companyId] = [];
      acc[c.companyId].push(c);
      return acc;
    },
    {}
  );

  const projectCompanies: CompanyWithContacts[] = rawCompanies.map((c) => ({
    ...c,
    contacts: contactsByCompany[c.id] ?? [],
  }));

  // Metrics
  const total = projectCompanies.length;
  const qualified = projectCompanies.filter((c) => c.status === "qualified").length;
  const contacted = projectCompanies.filter((c) => c.status === "contacted").length;
  const avgScore =
    total > 0
      ? Math.round(
          projectCompanies
            .filter((c) => c.matchScore !== null)
            .reduce((s, c) => s + (c.matchScore ?? 0), 0) /
            (projectCompanies.filter((c) => c.matchScore !== null).length || 1)
        )
      : null;

  // Extract keywords from ICP
  const keywordsMatch = project.icpDescription?.match(
    /Palabras clave de búsqueda:\s*(.+?)(?:\n|$)/
  );
  const keywords = keywordsMatch
    ? keywordsMatch[1].split(",").map((k) => k.trim()).filter(Boolean)
    : [];

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
            Proyectos
          </Link>
          <svg className="h-3.5 w-3.5 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">{project.name}</span>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
          Proyectos
        </Link>
      </header>

      <main className="flex-1 space-y-6 p-6">
        {/* ── Project hero card ── */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                {project.name}
              </h1>
              <a
                href={
                  project.sourceUrl.startsWith("http")
                    ? project.sourceUrl
                    : `https://${project.sourceUrl}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:underline"
              >
                {project.sourceUrl}
              </a>
            </div>
            <p className="text-xs text-zinc-400">
              Creado el{" "}
              {project.createdAt.toLocaleDateString("es-CL", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* ICP preview */}
          {project.icpDescription && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Perfil de Cliente Ideal (ICP)
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                  {project.icpDescription.split("---")[0].trim()}
                </p>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Metrics strip ── */}
        {total > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Leads", value: total },
              { label: "Calificados", value: qualified },
              { label: "Contactados", value: contacted },
              { label: "Score promedio", value: avgScore !== null ? `${avgScore}%` : "—" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Lead generation section ── */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 space-y-1">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Generar Leads
            </h2>
            <p className="text-sm text-zinc-500">
              El motor buscará empresas usando Google Places, scrapeará sus
              sitios y los calificará automáticamente con IA. El proceso toma
              1-3 minutos.
            </p>
          </div>
          <LeadDiscoveryForm projectId={project.id} currentCount={total} />
        </div>

        {/* ── Leads table ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Leads encontrados{total > 0 ? ` (${total})` : ""}
            </h2>
            {total > 0 && (
              <span className="text-xs text-zinc-400">
                Haz clic en cualquier fila para ver el detalle
              </span>
            )}
          </div>
          <LeadsTable companies={projectCompanies} projectId={id} />
        </div>
      </main>
    </div>
  );
}
