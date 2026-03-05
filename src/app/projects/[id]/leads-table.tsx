"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updateCompanyStatus } from "@/app/actions/leads";
import { enrichCompany } from "@/app/actions/contacts";
import type { CompanyWithContacts } from "@/types";
import type { Company } from "@/types";

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-400 text-xs">—</span>;
  const color =
    score >= 70
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : score >= 45
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-rose-100 text-rose-600 border-rose-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${color}`}
    >
      {score}%
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<Company["status"], string> = {
  pending: "Pendiente",
  qualified: "Calificado",
  rejected: "Rechazado",
  contacted: "Contactado",
};

const STATUS_STYLES: Record<Company["status"], string> = {
  pending: "bg-zinc-100 text-zinc-600 border-zinc-200",
  qualified: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-600 border-rose-200",
  contacted: "bg-blue-100 text-blue-700 border-blue-200",
};

function StatusBadge({ status }: { status: Company["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  return (
    <svg
      className={`h-3 w-3 transition-colors ${active ? "text-zinc-700 dark:text-zinc-200" : "text-zinc-300 dark:text-zinc-600"}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    >
      {dir === "asc" && active ? (
        <path d="m18 15-6-6-6 6" />
      ) : (
        <path d="m6 9 6 6 6-6" />
      )}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LeadsTableProps {
  companies: CompanyWithContacts[];
  projectId: string;
}

export function LeadsTable({ companies, projectId }: LeadsTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<CompanyWithContacts | null>(null);
  const [localCompanies, setLocalCompanies] = useState<CompanyWithContacts[]>(companies);
  const [isPending, startTransition] = useTransition();
  const [isEnriching, setIsEnriching] = useState(false);

  // ── Filter / sort state ──────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Company["status"] | "all">("all");
  const [sortCol, setSortCol] = useState<"score" | "name" | "status" | null>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Sync with server-side prop updates (e.g. after router.refresh())
  // Keep locally-overridden statuses, but take fresh contacts from the server
  useEffect(() => {
    setLocalCompanies((prev) => {
      const localById = new Map(prev.map((c) => [c.id, c]));
      return companies.map((c) => {
        const local = localById.get(c.id);
        // Preserve local status override but accept fresh contacts
        return local ? { ...c, status: local.status } : c;
      });
    });
    // Also keep Sheet in sync when contacts arrive after enrichment
    setSelected((prev) => {
      if (!prev) return null;
      const fresh = companies.find((c) => c.id === prev.id);
      return fresh ? { ...fresh, status: prev.status } : prev;
    });
  }, [companies]);

  if (localCompanies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
        <p className="text-sm font-medium text-zinc-500">
          No hay leads todavía.
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          Ingresa una ciudad y haz clic en &quot;Generar Leads&quot; para comenzar.
        </p>
      </div>
    );
  }

  // ── Derived: filter + sort ──────────────────────────────────────────────
  const STATUS_ORDER: Company["status"][] = ["qualified", "pending", "contacted", "rejected"];

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir(col === "name" ? "asc" : "desc");
    }
  };

  const displayCompanies = localCompanies
    .filter((c) => {
      const matchSearch = search === "" || c.name.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      if (sortCol === "score") {
        const diff = (a.matchScore ?? -1) - (b.matchScore ?? -1);
        return sortDir === "desc" ? -diff : diff;
      }
      if (sortCol === "name") {
        const diff = a.name.localeCompare(b.name);
        return sortDir === "asc" ? diff : -diff;
      }
      if (sortCol === "status") {
        const diff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
        return sortDir === "asc" ? diff : -diff;
      }
      return 0;
    });

  const handleStatusChange = (
    companyId: string,
    newStatus: Company["status"]
  ) => {
    startTransition(async () => {
      const result = await updateCompanyStatus({
        companyId,
        status: newStatus,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setLocalCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, status: newStatus } : c))
      );

      if (selected?.id === companyId) {
        setSelected((prev) => (prev ? { ...prev, status: newStatus } : null));
      }

      toast.success(
        `Estado actualizado: ${STATUS_LABELS[newStatus]}`
      );
    });
  };

  return (
    <>
      {/* ── Toolbar ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar empresa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-52 rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-xs text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          {(["all", "pending", "qualified", "contacted", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                statusFilter === s
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
              }`}
            >
              {s === "all" ? "Todos" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Count */}
        <span className="ml-auto text-xs text-zinc-400">
          {displayCompanies.length < localCompanies.length
            ? `${displayCompanies.length} de ${localCompanies.length}`
            : `${localCompanies.length}`}{" "}
          lead{localCompanies.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900">
              {/* Sortable: name */}
              <TableHead
                className="w-[220px] cursor-pointer select-none"
                onClick={() => toggleSort("name")}
              >
                <span className="flex items-center gap-1">
                  Empresa
                  <SortIcon active={sortCol === "name"} dir={sortDir} />
                </span>
              </TableHead>
              <TableHead>Resumen IA</TableHead>
              {/* Sortable: score */}
              <TableHead
                className="w-[80px] cursor-pointer select-none text-center"
                onClick={() => toggleSort("score")}
              >
                <span className="flex items-center justify-center gap-1">
                  Score
                  <SortIcon active={sortCol === "score"} dir={sortDir} />
                </span>
              </TableHead>
              {/* Sortable: status */}
              <TableHead
                className="w-[110px] cursor-pointer select-none"
                onClick={() => toggleSort("status")}
              >
                <span className="flex items-center gap-1">
                  Estado
                  <SortIcon active={sortCol === "status"} dir={sortDir} />
                </span>
              </TableHead>
              <TableHead className="w-[100px] text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-zinc-400">
                  Sin resultados — intenta cambiar los filtros
                </TableCell>
              </TableRow>
            ) : (
              displayCompanies.map((company) => (
              <TableRow
                key={company.id}
                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                onClick={() => setSelected(company as CompanyWithContacts)}
              >
                <TableCell className="font-medium">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate max-w-[200px]">{company.name}</span>
                    {company.websiteUrl && (
                      <a
                        href={
                          company.websiteUrl.startsWith("http")
                            ? company.websiteUrl
                            : `https://${company.websiteUrl}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-zinc-400 hover:text-zinc-600 hover:underline max-w-[200px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {company.websiteUrl
                          .replace(/^https?:\/\//, "")
                          .replace(/\/$/, "")}
                      </a>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400 max-w-sm">
                        {company.aiSummary?.split("\n\n")[0] ?? "—"}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-xs text-xs"
                    >
                      {company.aiSummary ?? "Sin resumen"}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>

                <TableCell className="text-center">
                  <ScoreBadge score={company.matchScore} />
                </TableCell>

                <TableCell>
                  <StatusBadge status={company.status} />
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(company as CompanyWithContacts);
                    }}
                  >
                    Ver más →
                  </Button>
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Detail Sheet ── */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="flex flex-col p-0 sm:max-w-lg">
          {selected && (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* ── Fixed header ── */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-5">
                <SheetHeader className="space-y-1.5">
                  <SheetTitle className="text-base leading-tight pr-8">
                    {selected.name}
                  </SheetTitle>
                  {selected.websiteUrl && (
                    <SheetDescription asChild>
                      <a
                        href={
                          selected.websiteUrl.startsWith("http")
                            ? selected.websiteUrl
                            : `https://${selected.websiteUrl}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-500 hover:underline"
                      >
                        {selected.websiteUrl}
                      </a>
                    </SheetDescription>
                  )}
                </SheetHeader>
                {/* Score + Status */}
                <div className="mt-3 flex items-center gap-2">
                  <ScoreBadge score={selected.matchScore} />
                  <StatusBadge status={selected.status} />
                </div>
              </div>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* AI Summary */}
                {selected.aiSummary && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      Análisis IA
                    </p>
                    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {selected.aiSummary}
                    </div>
                  </div>
                )}

                {/* Contacts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      Contactos ({selected.contacts?.length ?? 0})
                    </p>
                    <button
                      disabled={isEnriching}
                      onClick={() => {
                        setIsEnriching(true);
                        enrichCompany({ companyId: selected.id, projectId })
                          .then((res) => {
                            if (!res.ok) {
                              if (res.error.includes("HUNTER_API_KEY")) {
                                toast.error("Agrega HUNTER_API_KEY en .env.local", {
                                  description: "Crea una cuenta gratis en hunter.io y copia tu API key.",
                                  duration: 8000,
                                });
                              } else {
                                toast.error(res.error, { duration: 8000 });
                              }
                            } else if (res.count === 0) {
                              toast.info("No se encontraron contactos para esta empresa.");
                            } else {
                              toast.success(`${res.count} contacto${res.count === 1 ? "" : "s"} encontrado${res.count === 1 ? "" : "s"}.`);
                              router.refresh();
                            }
                          })
                          .catch(() => toast.error("Error al enriquecer contactos."))
                          .finally(() => setIsEnriching(false));
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    >
                      {isEnriching ? (
                        <>
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          Buscando...
                        </>
                      ) : (
                        <>
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                          Buscar con Hunter.io
                        </>
                      )}
                    </button>
                  </div>

                  {selected.contacts && selected.contacts.length > 0 ? (
                    <div className="space-y-2">
                      {selected.contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="rounded-lg border border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 p-3 space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Nombre desconocido"}
                              </p>
                              {contact.title && (
                                <p className="text-xs text-zinc-500">{contact.title}</p>
                              )}
                            </div>
                            {contact.linkedinUrl && (
                              <a
                                href={contact.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-zinc-400 hover:text-blue-600"
                                title="Ver LinkedIn"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
                              </a>
                            )}
                          </div>
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="block truncate text-xs text-blue-600 hover:underline"
                            >
                              {contact.email}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 p-4 text-center">
                      <p className="text-xs text-zinc-400">
                        Pulsa &ldquo;Buscar con Hunter.io&rdquo; para encontrar decision makers.
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-1">
                  {selected.status !== "contacted" && (
                    <Button
                      className="w-full"
                      onClick={() => handleStatusChange(selected.id, "contacted")}
                      disabled={isPending}
                    >
                      ✓ Marcar como Contactado
                    </Button>
                  )}
                  {selected.status !== "rejected" && (
                    <Button
                      variant="outline"
                      className="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                      onClick={() => handleStatusChange(selected.id, "rejected")}
                      disabled={isPending}
                    >
                      ✗ Rechazar Lead
                    </Button>
                  )}
                  {(selected.status === "rejected" || selected.status === "contacted") && (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => handleStatusChange(selected.id, "qualified")}
                      disabled={isPending}
                    >
                      ↩ Volver a Calificado
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
