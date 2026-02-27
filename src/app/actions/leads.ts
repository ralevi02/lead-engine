"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db, withRetry } from "@/db";
import { projects, companies } from "@/db/schema";

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

export type TriggerLeadsResult = { ok: true } | { ok: false; error: string };

export async function triggerLeadGeneration(
  input: z.infer<typeof triggerSchema>
): Promise<TriggerLeadsResult> {
  const parsed = triggerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { projectId, city } = parsed.data;

  // Verify project exists
  const [project] = await withRetry(() =>
    db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1)
  );

  if (!project) {
    return { ok: false, error: "Proyecto no encontrado." };
  }

  // Build absolute URL from request host
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const apiUrl = `${protocol}://${host}/api/leads/generate`;

  // Fire-and-forget: the route handler processes everything asynchronously.
  // The client polls /projects/[id] every 15s to pick up new results.
  fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, city }),
  }).catch((err) => console.error("[triggerLeadGeneration] fetch error:", err));

  return { ok: true };
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
    await withRetry(() =>
      db
        .update(companies)
        .set({ status: parsed.data.status })
        .where(eq(companies.id, parsed.data.companyId))
    );

    return { ok: true };
  } catch (err) {
    console.error("[updateCompanyStatus]", err);
    return { ok: false, error: "Error al actualizar el estado." };
  }
}
