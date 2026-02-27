"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, withRetry } from "@/db";
import { companies, contacts } from "@/db/schema";
import { searchContacts } from "@/lib/hunter";

// ─── Schema ───────────────────────────────────────────────────────────────────

const enrichSchema = z.object({
  companyId: z.string().uuid(),
  projectId: z.string().uuid(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type EnrichResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

// ─── Action ───────────────────────────────────────────────────────────────────

export async function enrichCompany(
  input: z.infer<typeof enrichSchema>
): Promise<EnrichResult> {
  const parsed = enrichSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { companyId, projectId } = parsed.data;

  // Load company
  const [company] = await withRetry(() =>
    db.select().from(companies).where(eq(companies.id, companyId)).limit(1)
  );

  if (!company) return { ok: false, error: "Empresa no encontrada." };
  if (!company.websiteUrl) {
    return { ok: false, error: "La empresa no tiene URL para buscar contactos." };
  }

  // Delete old contacts before re-enriching
  await withRetry(() => db.delete(contacts).where(eq(contacts.companyId, companyId)));

  try {
    const found = await searchContacts(company.websiteUrl, 5);

    if (found.length === 0) {
      return { ok: true, count: 0 };
    }

    await withRetry(() =>
      db.insert(contacts).values(
        found.map((c) => ({
          companyId,
          firstName: c.firstName || null,
          lastName: c.lastName || null,
          title: c.title || null,
          email: c.email || null,
          linkedinUrl: c.linkedinUrl || null,
        }))
      )
    );

    revalidatePath(`/projects/${projectId}`);
    return { ok: true, count: found.length };
  } catch (err) {
    console.error("[enrichCompany]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error al enriquecer contactos.",
    };
  }
}
