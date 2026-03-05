import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, withRetry } from "@/db";
import { projects, companies } from "@/db/schema";
import {
  searchPlaces,
  deduplicatePlaces,
  extractKeywordsFromIcp,
} from "@/lib/google-places";
import { scrapeUrl } from "@/lib/scraper";
import { scoreCompany } from "@/lib/scorer";
import { revalidatePath } from "next/cache";

// Allow up to 5 minutes on Vercel Pro / local dev
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { projectId, city } = await req.json();

    if (!projectId || !city) {
      return NextResponse.json(
        { ok: false, error: "projectId y city son requeridos" },
        { status: 400 }
      );
    }

    // 1. Load project
    const [project] = await withRetry(() =>
      db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
    );

    if (!project) {
      return NextResponse.json(
        { ok: false, error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    // 2. Extract search keywords from ICP
    const keywords = extractKeywordsFromIcp(project.icpDescription ?? "");
    // Use all available keywords (up to 8), fall back to project name
    const searchTerms =
      keywords.length > 0 ? keywords : [project.name];

    // 3. Search Google Places — 20 results per keyword, dedup, keep up to 50
    const allResults = [];
    for (const keyword of searchTerms) {
      const found = await searchPlaces(keyword, city, 20);
      allResults.push(...found);
    }

    // Include companies without website — we can still score them with name+address
    const places = deduplicatePlaces(allResults).slice(0, 50);

    if (places.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        message: "No se encontraron empresas con sitio web para esa ciudad.",
      });
    }

    // 4. Process each place: scrape → score → save
    let processed = 0;
    const results = [];

    for (const place of places) {
      // Skip duplicates already saved for this project
      const existing = await withRetry(() =>
        db
          .select({ id: companies.id })
          .from(companies)
          .where(eq(companies.googlePlaceId, place.placeId))
          .limit(1)
      );

      if (existing.length > 0) continue;

      // Scrape (if no website, use name + address as context)
      let content = "";
      try {
        if (place.websiteUri) {
          content = await scrapeUrl(place.websiteUri);
        } else {
          content = `Empresa: ${place.name}. Dirección: ${place.address}. Sin sitio web propio.`;
        }
      } catch {
        content = `Empresa: ${place.name}. Dirección: ${place.address}.`;
      }

      // Score with Groq
      const scoring = await scoreCompany(
        project.icpDescription ?? "",
        content,
        place.name
      );

      // Save to DB
      await withRetry(() =>
        db.insert(companies).values({
          projectId,
          name: place.name,
          websiteUrl: place.websiteUri,
          googlePlaceId: place.placeId,
          aiSummary: `${scoring.summary}\n\n**Razonamiento:** ${scoring.reasoning}`,
          matchScore: scoring.score,
          status: scoring.status,
        })
      );

      processed++;
      results.push({ name: place.name, score: scoring.score });
    }

    revalidatePath(`/projects/${projectId}`);

    return NextResponse.json({ ok: true, processed, results });
  } catch (err) {
    console.error("[POST /api/leads/generate]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Error interno",
      },
      { status: 500 }
    );
  }
}
