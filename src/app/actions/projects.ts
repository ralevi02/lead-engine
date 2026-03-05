"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, withRetry } from "@/db";
import { projects } from "@/db/schema";
import { scrapeUrl } from "@/lib/scraper";
import { generateICP } from "@/lib/icp";
import type { IcpResult } from "@/lib/icp";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const analyzeSchema = z.object({
  sourceUrl: z
    .string()
    .min(3, "URL requerida")
    .transform((v) => v.trim().replace(/^https?:\/\//, "").replace(/\/$/, "")),
});

const createSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100),
  sourceUrl: z.string().min(3),
  icpDescription: z.string().min(10, "La descripción del ICP es requerida"),
  searchKeywords: z.array(z.string()).default([]),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalyzeResult =
  | ({ ok: true } & IcpResult)
  | { ok: false; error: string };

export type CreateProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Step 1 — Scrape the company website and generate an ICP using Groq.
 * Returns the ICP description and search keywords for the user to review.
 */
export async function analyzeCompanyUrl(
  rawUrl: string
): Promise<AnalyzeResult> {
  const parsed = analyzeSchema.safeParse({ sourceUrl: rawUrl });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { sourceUrl } = parsed.data;

  try {
    const websiteContent = await scrapeUrl(sourceUrl);
    const icp = await generateICP(websiteContent);
    return { ok: true, ...icp };
  } catch (err) {
    console.error("[analyzeCompanyUrl]", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Error al analizar la URL. Verifica que sea accesible.",
    };
  }
}

/**
 * Step 2 — Persist the project to the database after the user has reviewed the ICP.
 */
export async function createProject(
  input: z.infer<typeof createSchema>
): Promise<CreateProjectResult> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const { name, sourceUrl, icpDescription, searchKeywords } = parsed.data;

  // Append keywords as a structured section so they live in the same column
  const fullIcp = [
    icpDescription.trim(),
    "",
    `---\nPalabras clave de búsqueda: ${searchKeywords.join(", ")}`,
  ]
    .join("\n")
    .trim();

  try {
    const [project] = await withRetry(() =>
      db
        .insert(projects)
        .values({ name, sourceUrl, icpDescription: fullIcp })
        .returning({ id: projects.id })
    );

    revalidatePath("/");

    return { ok: true, projectId: project.id };
  } catch (err) {
    console.error("[createProject]", err);
    return { ok: false, error: "Error al guardar el proyecto." };
  }
}
