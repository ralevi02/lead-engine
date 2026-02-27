/**
 * Hunter.io Domain Search
 * Finds email addresses and decision makers at a company by domain.
 * Free plan: 25 searches/month — https://hunter.io
 * Docs: https://hunter.io/api-documentation/v2#domain-search
 */

export interface HunterContact {
  firstName: string;
  lastName: string;
  title: string;
  email: string | null;
  linkedinUrl: string | null;
}

function extractDomain(url: string): string | null {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const hostname = new URL(normalized).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function searchContacts(
  websiteUrl: string,
  maxResults = 5
): Promise<HunterContact[]> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) throw new Error("HUNTER_API_KEY no configurada");

  const domain = extractDomain(websiteUrl);
  if (!domain) throw new Error(`URL inválida: ${websiteUrl}`);

  const url = new URL("https://api.hunter.io/v2/domain-search");
  url.searchParams.set("domain", domain);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("limit", String(maxResults));
  url.searchParams.set("type", "personal");

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 401) {
    throw new Error("API key de Hunter.io inválida. Verifica HUNTER_API_KEY en .env.local");
  }

  if (res.status === 429) {
    throw new Error("Límite de búsquedas de Hunter.io alcanzado. El plan gratuito permite 25 búsquedas/mes.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hunter.io error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const emails: HunterContact[] = (data?.data?.emails ?? [])
    .slice(0, maxResults)
    .map((e: Record<string, unknown>) => ({
      firstName: (e.first_name as string) ?? "",
      lastName: (e.last_name as string) ?? "",
      title: (e.position as string) ?? "",
      email: (e.value as string) ?? null,
      linkedinUrl: (e.linkedin as string) ?? null,
    }));

  return emails;
}
