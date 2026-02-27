/**
 * Scrapes a URL using Jina AI Reader and returns the page content as clean Markdown.
 */
export async function scrapeUrl(rawUrl: string): Promise<string> {
  const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
  const jinaUrl = `https://r.jina.ai/${normalized}`;

  const res = await fetch(jinaUrl, {
    headers: {
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      Accept: "text/markdown",
      "X-Return-Format": "markdown",
      "X-Timeout": "15",
    },
    // Give 20s for the external call — runs inside a Server Action so no Vercel timeout issue
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(
      `Jina scraping failed for "${normalized}": ${res.status} ${res.statusText}`
    );
  }

  const text = await res.text();
  // Trim to avoid blowing Groq's context window (≈8k chars ≈ 2k tokens)
  return text.slice(0, 8_000);
}
