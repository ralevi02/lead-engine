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
    const searchTerms =
      keywords.length > 0 ? keywords.slice(0, 4) : [project.name];

    // 3. Search Google Places
    const allResults = [];
    for (const keyword of searchTerms) {
      const found = await searchPlaces(keyword, city, 15);
      allResults.push(...found);
    }

    const places = deduplicatePlaces(allResults)
      .filter((p) => p.websiteUri)
      .slice(0, 20);

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

      // Scrape
      let content = "";
      try {
        content = await scrapeUrl(place.websiteUri!);
      } catch {
        content = `Empresa: ${place.name}. Dirección: ${place.address}`;
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
