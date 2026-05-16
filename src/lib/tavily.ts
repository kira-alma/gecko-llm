const TAVILY_BASE = "https://api.tavily.com";

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  raw_content?: string;
}

export interface TavilyResponse {
  query: string;
  results: TavilyResult[];
  answer?: string;
}

export async function tavilySearch(params: {
  query: string;
  searchDepth?: "basic" | "advanced";
  maxResults?: number;
  includeAnswer?: boolean;
  includeRawContent?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
}): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");

  const response = await fetch(`${TAVILY_BASE}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query: params.query,
      search_depth: params.searchDepth ?? "advanced",
      max_results: params.maxResults ?? 5,
      include_answer: params.includeAnswer ?? false,
      include_raw_content: params.includeRawContent ?? false,
      include_domains: params.includeDomains,
      exclude_domains: params.excludeDomains,
    }),
  });

  if (!response.ok) {
    // Retry once on rate limit (429) or server error (5xx)
    if (response.status === 429 || response.status >= 500) {
      console.warn(`[GeckoLLM] Tavily ${response.status} for "${params.query.slice(0, 50)}...", retrying in 3s...`);
      await new Promise(r => setTimeout(r, 3000));
      const retry = await fetch(`${TAVILY_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: params.query,
          search_depth: params.searchDepth ?? "advanced",
          max_results: params.maxResults ?? 5,
          include_answer: params.includeAnswer ?? false,
          include_raw_content: params.includeRawContent ?? false,
          include_domains: params.includeDomains,
          exclude_domains: params.excludeDomains,
        }),
      });
      if (retry.ok) {
        const retryData = await retry.json();
        const results: TavilyResult[] = (retryData.results ?? []).map(
          (r: TavilyResult) => ({
            title: r.title, url: r.url,
            content: r.content?.slice(0, 2000) ?? "",
            score: r.score, raw_content: r.raw_content?.slice(0, 3000),
          })
        );
        return { query: params.query, results, answer: retryData.answer };
      }
      const retryText = await retry.text();
      console.error(`[GeckoLLM] Tavily retry also failed (${retry.status}): ${retryText.slice(0, 200)}`);
      // Return empty results instead of throwing — don't kill the pipeline
      return { query: params.query, results: [] };
    }
    const text = await response.text();
    console.error(`[GeckoLLM] Tavily error (${response.status}): ${text.slice(0, 200)}`);
    // Return empty results for non-retryable errors too
    return { query: params.query, results: [] };
  }

  const data = await response.json();

  // Truncate raw_content to prevent token explosion
  const results: TavilyResult[] = (data.results ?? []).map(
    (r: TavilyResult) => ({
      title: r.title,
      url: r.url,
      content: r.content?.slice(0, 2000) ?? "",
      score: r.score,
      raw_content: r.raw_content?.slice(0, 3000),
    })
  );

  return {
    query: params.query,
    results,
    answer: data.answer,
  };
}

export async function tavilySearchBatch(
  queries: {
    query: string;
    searchDepth?: "basic" | "advanced";
    maxResults?: number;
    includeAnswer?: boolean;
    includeRawContent?: boolean;
    includeDomains?: string[];
  }[]
): Promise<TavilyResponse[]> {
  return Promise.all(queries.map((q) => tavilySearch(q)));
}

export function formatSearchResults(responses: TavilyResponse[]): string {
  return responses
    .map((resp) => {
      const results = resp.results
        .map(
          (r) =>
            `  - [${r.title}](${r.url})\n    ${r.content.slice(0, 500)}`
        )
        .join("\n");
      return `Query: "${resp.query}"\n${results}`;
    })
    .join("\n\n");
}
