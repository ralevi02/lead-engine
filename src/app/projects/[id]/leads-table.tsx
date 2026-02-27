"use client";

import { useState, useTransition } from "react";
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

// ─── Main component ───────────────────────────────────────────────────────────

interface LeadsTableProps {
  companies: Company[];
}

export function LeadsTable({ companies }: LeadsTableProps) {
  const [selected, setSelected] = useState<Company | null>(null);
  const [localCompanies, setLocalCompanies] = useState<Company[]>(companies);
  const [isPending, startTransition] = useTransition();

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
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-900">
              <TableHead className="w-[220px]">Empresa</TableHead>
              <TableHead>Resumen IA</TableHead>
              <TableHead className="w-[80px] text-center">Score</TableHead>
              <TableHead className="w-[110px]">Estado</TableHead>
              <TableHead className="w-[100px] text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localCompanies.map((company) => (
              <TableRow
                key={company.id}
                className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                onClick={() => setSelected(company)}
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
                      setSelected(company);
                    }}
                  >
                    Ver más →
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Detail Sheet ── */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader className="space-y-2">
                <SheetTitle className="text-lg leading-tight pr-8">
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
                      className="text-sm text-zinc-500 hover:underline"
                    >
                      {selected.websiteUrl}
                    </a>
                  </SheetDescription>
                )}
              </SheetHeader>

              <div className="mt-6 space-y-5">
                {/* Score */}
                <div className="flex items-center gap-3">
                  <ScoreBadge score={selected.matchScore} />
                  <StatusBadge status={selected.status} />
                </div>

                {/* AI Summary */}
                {selected.aiSummary && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Análisis IA
                    </p>
                    <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-4 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {selected.aiSummary}
                    </div>
                  </div>
                )}

                {/* Contact placeholder (Phase 3) */}
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Contacto Principal
                  </p>
                  <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 p-4 text-center">
                    <p className="text-xs text-zinc-400">
                      La búsqueda de contactos estará disponible en la siguiente versión.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2">
                  {selected.status !== "contacted" && (
                    <Button
                      className="w-full"
                      onClick={() =>
                        handleStatusChange(selected.id, "contacted")
                      }
                      disabled={isPending}
                    >
                      ✓ Marcar como Contactado
                    </Button>
                  )}
                  {selected.status !== "rejected" && (
                    <Button
                      variant="outline"
                      className="w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                      onClick={() =>
                        handleStatusChange(selected.id, "rejected")
                      }
                      disabled={isPending}
                    >
                      ✗ Rechazar Lead
                    </Button>
                  )}
                  {(selected.status === "rejected" ||
                    selected.status === "contacted") && (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() =>
                        handleStatusChange(selected.id, "qualified")
                      }
                      disabled={isPending}
                    >
                      ↩ Volver a Calificado
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
