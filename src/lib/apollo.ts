/**
 * Apollo.io People Search
 * Finds decision makers at a company by domain.
 * Docs: https://apolloio.github.io/apollo-api-docs/?shell#people-search
 */

export interface ApolloContact {
  firstName: string;
  lastName: string;
  title: string;
  email: string | null;
  linkedinUrl: string | null;
}

const ICP_TITLES = [
  "CEO",
  "CTO",
  "COO",
  "CFO",
  "Founder",
  "Co-Founder",
  "Director",
  "Manager",
  "Head",
  "VP",
  "President",
  "General Manager",
  "Gerente",
  "Director General",
  "Subgerente",
];

function extractDomain(url: string): string | null {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const hostname = new URL(normalized).hostname;
    // Strip www.
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export async function searchContacts(
  websiteUrl: string,
  maxResults = 5
): Promise<ApolloContact[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) throw new Error("APOLLO_API_KEY no configurada");

  const domain = extractDomain(websiteUrl);
  if (!domain) throw new Error(`URL inválida: ${websiteUrl}`);

  const body = {
    q_organization_domains: [domain],
    person_titles: ICP_TITLES,
    per_page: maxResults,
    page: 1,
  };

  const res = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  if (res.status === 403) {
    throw new Error(
      "La búsqueda de contactos requiere un plan pagado de Apollo.io. " +
      "Actualiza tu plan en https://app.apollo.io/"
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apollo API error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const people: ApolloContact[] = (data.people ?? [])
    .slice(0, maxResults)
    .map((p: Record<string, unknown>) => ({
      firstName: (p.first_name as string) ?? "",
      lastName: (p.last_name as string) ?? "",
      title: (p.title as string) ?? "",
      email: (p.email as string | null) ?? null,
      linkedinUrl: (p.linkedin_url as string | null) ?? null,
    }));

  return people;
}
