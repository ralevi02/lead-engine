/**
 * Google Places API (New) — Text Search
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 *
 * Required: Enable "Places API (New)" in Google Cloud Console.
 */

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  websiteUri: string | null;
}

interface PlacesApiResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    websiteUri?: string;
    businessStatus?: string;
  }>;
}

/**
 * Search Google Places for companies matching a query in a specific city.
 * Returns up to maxResults deduplicated places with a website URL.
 */
export async function searchPlaces(
  query: string,
  city: string,
  maxResults = 20
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY is not set");

  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.websiteUri,places.businessStatus",
      },
      body: JSON.stringify({
        textQuery: `${query} ${city}`,
        maxResultCount: Math.min(maxResults, 20), // Google's hard limit is 20
        languageCode: "es",
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Google Places API error ${res.status}: ${body.slice(0, 200)}`
    );
  }

  const data: PlacesApiResponse = await res.json();
  const places = data.places ?? [];

  return places
    // Only include operational businesses
    .filter((p) => !p.businessStatus || p.businessStatus === "OPERATIONAL")
    .map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? "Sin nombre",
      address: p.formattedAddress ?? "",
      websiteUri: p.websiteUri ?? null,
    }));
}

/**
 * Deduplicate places by placeId, keeping the first occurrence.
 */
export function deduplicatePlaces(places: PlaceResult[]): PlaceResult[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    if (seen.has(p.placeId)) return false;
    seen.add(p.placeId);
    return true;
  });
}

/**
 * Extract search keywords from an ICP description.
 * The ICP text ends with: "---\nPalabras clave de búsqueda: kw1, kw2, ..."
 */
export function extractKeywordsFromIcp(icpDescription: string): string[] {
  const match = icpDescription.match(
    /Palabras clave de búsqueda:\s*(.+?)(?:\n|$)/
  );
  if (!match) return [];
  return match[1]
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 8); // up from 6 — use all available keywords
}
