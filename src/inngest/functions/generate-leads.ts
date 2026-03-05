import { eq } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { db } from "@/db";
import { projects, companies } from "@/db/schema";
import { searchPlaces, deduplicatePlaces, extractKeywordsFromIcp } from "@/lib/google-places";
import { scrapeUrl } from "@/lib/scraper";
import { scoreCompany } from "@/lib/scorer";

// ─── Event type ───────────────────────────────────────────────────────────────

export type GenerateLeadsEvent = {
  name: "leads/generate";
  data: {
    projectId: string;
    city: string;
  };
};

// ─── Function ─────────────────────────────────────────────────────────────────

export const generateLeadsFunction = inngest.createFunction(
  {
    id: "generate-leads",
    name: "Generate Leads for Project",
    concurrency: { limit: 3 }, // max 3 projects processing at once
    retries: 2,
  },
  { event: "leads/generate" },

  async ({ event, step }) => {
    const { projectId, city } = event.data;

    // ── 1. Load project + extract keywords ────────────────────────────────────
    const project = await step.run("load-project", async () => {
      const [p] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!p) throw new Error(`Project ${projectId} not found`);
      return p;
    });

    const keywords = extractKeywordsFromIcp(project.icpDescription ?? "");

    // Fallback: use project name as keyword if ICP has no keywords section
    const searchTerms =
      keywords.length > 0 ? keywords.slice(0, 4) : [project.name];

    // ── 2. Search Google Places for each keyword ──────────────────────────────
    const allPlaces = await step.run("search-places", async () => {
      const results = [];
      for (const keyword of searchTerms) {
        const found = await searchPlaces(keyword, city, 15);
        results.push(...found);
      }
      const deduped = deduplicatePlaces(results);

      // Filter to places that have a website (needed for scraping)
      return deduped.filter((p) => p.websiteUri).slice(0, 20);
    });

    if (allPlaces.length === 0) {
      return { processed: 0, message: "No places with websites found" };
    }

    // ── 3. Process each place: scrape → score → save ──────────────────────────
    let processed = 0;

    for (const place of allPlaces) {
      await step.run(`process-place-${place.placeId}`, async () => {
        // Skip if this place is already in the DB for this project
        const existing = await db
          .select({ id: companies.id })
          .from(companies)
          .where(eq(companies.googlePlaceId, place.placeId))
          .limit(1);

        if (existing.length > 0) return { skipped: true };

        // Scrape the website
        let websiteContent = "";
        try {
          websiteContent = await scrapeUrl(place.websiteUri!);
        } catch {
          // If scraping fails, use name+address as minimal content
          websiteContent = `Empresa: ${place.name}. Dirección: ${place.address}`;
        }

        // Score with Groq
        const scoring = await scoreCompany(
          project.icpDescription ?? "",
          websiteContent,
          place.name
        );

        // Save to DB
        await db.insert(companies).values({
          projectId,
          name: place.name,
          websiteUrl: place.websiteUri,
          googlePlaceId: place.placeId,
          aiSummary: `${scoring.summary}\n\n**Razonamiento:** ${scoring.reasoning}`,
          matchScore: scoring.score,
          status: scoring.status,
        });

        processed++;
        return { processed: true, name: place.name, score: scoring.score };
      });
    }

    return {
      processed,
      total: allPlaces.length,
      projectId,
    };
  }
);
