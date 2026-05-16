import { callClaudeJSON } from "../anthropic";
import { tavilySearchBatch, formatSearchResults } from "../tavily";
import {
  RESEARCH_SYSTEM_PROMPT,
  buildResearchPrompt,
  buildResearchRefinementPrompt,
} from "../prompts/research";
import type { ProductResearch, SearchResult } from "../types";

export async function runProductResearch(
  productName: string,
  onProgress: (message: string, progress: number) => void
): Promise<ProductResearch> {
  // Wave 1: Broad product research (3 parallel searches)
  onProgress("Searching for product information...", 0);

  const wave1Results = await tavilySearchBatch([
    {
      query: `"${productName}" specifications features price`,
      maxResults: 5,
      includeAnswer: true,
    },
    {
      query: `"${productName}" review 2024 2025 2026`,
      maxResults: 5,
    },
    {
      query: `"${productName}" vs alternative competitor comparison`,
      maxResults: 5,
    },
  ]);

  // Claude Call 1: Extract initial product analysis
  onProgress("Analyzing product details...", 0.25);

  const wave1Formatted = formatSearchResults(wave1Results);
  const initialAnalysis = await callClaudeJSON<ProductResearch>({
    systemPrompt: RESEARCH_SYSTEM_PROMPT,
    userPrompt: buildResearchPrompt(productName, wave1Formatted),
    cacheSystemPrompt: true,
  });

  // Wave 2: Deeper research based on initial findings
  onProgress("Researching competitors and categories...", 0.5);

  const categories = initialAnalysis.categories?.slice(0, 2) ?? [];
  const competitors = initialAnalysis.competitors?.slice(0, 3) ?? [];

  const wave2Queries = [
    ...categories.map((cat) => ({
      query: `best ${cat.name} 2025 2026 buying guide`,
      maxResults: 5,
    })),
    ...competitors.slice(0, 2).map((comp) => ({
      query: `"${comp.name}" vs "${productName}" comparison`,
      maxResults: 3,
    })),
  ];

  const wave2Results =
    wave2Queries.length > 0 ? await tavilySearchBatch(wave2Queries) : [];

  // Claude Call 2: Merge and refine
  onProgress("Synthesizing research...", 0.75);

  const wave2Formatted = formatSearchResults(wave2Results);
  const finalAnalysis = await callClaudeJSON<ProductResearch>({
    systemPrompt: RESEARCH_SYSTEM_PROMPT,
    userPrompt: buildResearchRefinementPrompt(
      JSON.stringify(initialAnalysis, null, 2),
      wave2Formatted
    ),
    cacheSystemPrompt: true,
  });

  // Attach raw search results for transparency
  const allSearchResults: SearchResult[] = [...wave1Results, ...wave2Results].map(
    (r) => ({
      query: r.query,
      results: r.results.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score,
      })),
    })
  );

  finalAnalysis.searchResults = allSearchResults;

  onProgress("Product research complete", 1);
  return finalAnalysis;
}
