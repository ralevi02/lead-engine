"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { projects, companies } from "@/db/schema";
import { inngest } from "@/inngest/client";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const triggerSchema = z.object({
  projectId: z.string().uuid(),
  city: z.string().min(2, "Ciudad requerida").max(100),
});

const updateStatusSchema = z.object({
  companyId: z.string().uuid(),
  status: z.enum(["pending", "qualified", "rejected", "contacted"]),
});

// ─── Trigger lead generation ──────────────────────────────────────────────────

export type TriggerLeadsResult =
  | { ok: true; eventId: string }
  | { ok: false; error: string };

export async function triggerLeadGeneration(
  input: z.infer<typeof triggerSchema>
): Promise<TriggerLeadsResult> {
  const parsed = triggerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { projectId, city } = parsed.data;

  // Verify project exists
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  if (!project) {
    return { ok: false, error: "Proyecto no encontrado." };
  }

  try {
    const { ids } = await inngest.send({
      name: "leads/generate",
      data: { projectId, city },
    });

    revalidatePath(`/projects/${projectId}`);
    return { ok: true, eventId: ids[0] };
  } catch (err) {
    console.error("[triggerLeadGeneration]", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "Error al iniciar la búsqueda.",
    };
  }
}

// ─── Update company status ─────────────────────────────────────────────────

export type UpdateStatusResult = { ok: true } | { ok: false; error: string };

export async function updateCompanyStatus(
  input: z.infer<typeof updateStatusSchema>
): Promise<UpdateStatusResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  try {
    await db
      .update(companies)
      .set({ status: parsed.data.status })
      .where(eq(companies.id, parsed.data.companyId));

    return { ok: true };
  } catch (err) {
    console.error("[updateCompanyStatus]", err);
    return { ok: false, error: "Error al actualizar el estado." };
  }
}
