import { callClaude, extractJSON, callClaudeJSON } from "../anthropic";
import { tavilySearchBatch, formatSearchResults, type TavilyResponse } from "../tavily";
import { getRelevantSubreddits, DEFAULT_RETAILERS } from "../retailers";
import {
  EVIDENCE_EXTRACTION_SYSTEM_PROMPT,
  buildEvidenceExtractionPrompt,
  PERSONA_SYNTHESIS_SYSTEM_PROMPT,
  buildPersonaSynthesisPrompt,
  QUERY_EXPANSION_SYSTEM_PROMPT,
  buildQueryExpansionPrompt,
  EVIDENCE_EXPANSION_SYSTEM_PROMPT,
  buildEvidenceExpansionPrompt,
} from "../prompts/personas";
import type {
  ProductResearch,
  RetailerPersonas,
  SearchQuery,
  ClusteringData,
  SourceQuote,
  ResearchStats,
  ResearchQuery,
} from "../types";

export interface ListingRating {
  stars: number;
  count: string;
}

export interface CompetitorListingData {
  name: string;
  content: string;
  verified: boolean; // true = we scraped their actual listing, false = no listing found
}

export interface PersonaStageOutput {
  personas: RetailerPersonas;
  searchQueries: SearchQuery[];
  actualListingContent: string | null;
  actualRating: ListingRating | null;
  competitorListings: CompetitorListingData[];
  clusteringData: ClusteringData;
  sources: SourceQuote[];
  researchStats: ResearchStats;
}

function classifySourceType(url: string): "reddit" | "reviews" | "forums" | "articles" | "guides" {
  const lower = url.toLowerCase();
  if (lower.includes("reddit.com")) return "reddit";
  if (lower.includes("amazon.com") || lower.includes("walmart.com") || lower.includes("target.com") || lower.includes("bestbuy.com") || lower.includes("costco.com")) return "reviews";
  if (lower.includes("forum") || lower.includes("community") || lower.includes("discuss")) return "forums";
  if (lower.includes("guide") || lower.includes("best") || lower.includes("top-")) return "guides";
  return "articles";
}

function buildResearchStats(
  allResponses: TavilyResponse[],
  queryMeta: { query: string; sourceType: ResearchQuery["sourceType"] }[],
  extractedQuotes: number,
  personaIds: string[]
): ResearchStats {
  const scannedPages: ResearchStats["scannedPages"] = [];
  const breakdown = { reddit: 0, reviews: 0, forums: 0, articles: 0, guides: 0 };
  let totalWords = 0;

  for (const resp of allResponses) {
    for (const r of resp.results) {
      const sourceType = classifySourceType(r.url);
      breakdown[sourceType]++;
      totalWords += (r.content?.split(/\s+/).length ?? 0) + (r.raw_content?.split(/\s+/).length ?? 0);
      scannedPages.push({ title: r.title, url: r.url, sourceType });
    }
  }

  const researchQueries: ResearchQuery[] = queryMeta.map((meta, i) => ({
    query: meta.query,
    resultCount: allResponses[i]?.results.length ?? 0,
    sourceType: meta.sourceType,
    personasInformed: personaIds,
  }));

  return {
    totalSourcesScanned: scannedPages.length,
    totalWordsAnalyzed: totalWords,
    totalQuotesExtracted: extractedQuotes,
    researchQueries,
    breakdown,
    scannedPages,
  };
}

export async function runPersonaGeneration(
  productResearch: ProductResearch,
  retailerName: string,
  retailerDomain: string,
  selectedCategories: string[],
  onProgress: (message: string, progress: number) => void
): Promise<PersonaStageOutput> {
  const productName = productResearch.productName;
  const categoryNames = productResearch.categories.map((c) => c.name);
  const subreddits = getRelevantSubreddits(categoryNames);
  const primaryCategory = categoryNames[0] || "products";
  const secondaryCategory = categoryNames[1] || primaryCategory;
  const topCompetitors = productResearch.competitors.slice(0, 3);
  const retailerDef = DEFAULT_RETAILERS.find(r => r.name.toLowerCase() === retailerName.toLowerCase() || r.domain === retailerDomain);
  const retailerSearchBehavior = retailerDef?.searchBehavior ?? "";

  // ============================================================
  // Wave 1: Reddit deep mining (6 parallel searches)
  // ============================================================
  onProgress(`Mining Reddit for ${retailerName} shopper discussions...`, 0);

  const wave1Queries = [
    { query: `site:reddit.com "${productName}" recommend review`, sourceType: "reddit" as const },
    { query: `site:reddit.com r/${subreddits[0] || "BuyItForLife"} best ${primaryCategory} buying advice 2024 2025`, sourceType: "reddit" as const },
    { query: `site:reddit.com "${retailerName}" ${primaryCategory} experience review shopping`, sourceType: "reddit" as const },
    { query: `site:reddit.com r/${subreddits[1] || "frugal"} ${primaryCategory} worth it recommendation`, sourceType: "reddit" as const },
    { query: `site:reddit.com "${productName}" OR "${primaryCategory}" vs comparison which should`, sourceType: "reddit" as const },
    { query: `site:reddit.com ${secondaryCategory} gift recommendation budget`, sourceType: "reddit" as const },
  ];

  const wave1Results = await tavilySearchBatch(
    wave1Queries.map((q) => ({
      query: q.query,
      maxResults: 8,
      includeRawContent: true,
      includeDomains: ["reddit.com"],
    }))
  );

  // ============================================================
  // Wave 1b: Fetch actual product listing from this retailer
  // ============================================================
  let actualListingContent: string | null = null;
  let actualRating: ListingRating | null = null;
  try {
    const listingResults = await tavilySearchBatch([{
      query: `site:${retailerDomain} "${productName}"`,
      maxResults: 1,
      includeRawContent: true,
    }]);
    const listing = listingResults[0]?.results[0];
    if (listing?.raw_content) {
      actualListingContent = listing.raw_content;
    } else if (listing?.content) {
      actualListingContent = listing.content;
    }
    // Parse real rating from listing content
    if (actualListingContent) {
      const text = actualListingContent;
      // Match patterns like "4.5 out of 5", "4.5/5", "Rating: 4.5"
      const starsMatch = text.match(/(\d\.\d)\s*(?:out of\s*5|\/\s*5|stars?)/i)
        || text.match(/rating[:\s]+(\d\.\d)/i);
      // Match patterns like "1,234 ratings", "1234 reviews", "2.5K ratings"
      const countMatch = text.match(/([\d,]+(?:\.\d+)?[KkMm]?)\s*(?:ratings?|reviews?|evaluations?)/i);
      if (starsMatch) {
        actualRating = {
          stars: parseFloat(starsMatch[1]),
          count: countMatch ? countMatch[1] + " ratings" : "ratings available",
        };
      }
    }
  } catch {
    // Non-critical — continue without actual listing
  }

  // ============================================================
  // Wave 1c: Fetch ALL competitor listings from this retailer
  // ============================================================
  const allCompetitors = productResearch.competitors;
  const competitorListings: CompetitorListingData[] = [];
  // Batch in groups of 3 to avoid rate limits
  for (let batch = 0; batch < allCompetitors.length; batch += 3) {
    const batchComps = allCompetitors.slice(batch, batch + 3);
    try {
      const compSearches = batchComps.map(comp => ({
        query: `site:${retailerDomain} "${comp.name}"`,
        maxResults: 1,
        includeRawContent: true,
      }));
      const compResults = await tavilySearchBatch(compSearches);
      for (let ci = 0; ci < batchComps.length; ci++) {
        const result = compResults[ci]?.results[0];
        if (result) {
          // Use cleaned content (snippet) as primary, raw_content as supplement
          const cleanContent = result.content ?? "";
          const rawContent = result.raw_content ?? "";
          // Combine: clean content first (more readable), then raw for extra detail
          const combined = cleanContent + (rawContent.length > cleanContent.length ? "\n\n" + rawContent.slice(cleanContent.length) : "");
          competitorListings.push({
            name: batchComps[ci].name,
            content: combined.slice(0, 2500),
            verified: true,
          });
        } else {
          // No listing found — mark as unverified
          competitorListings.push({
            name: batchComps[ci].name,
            content: "",
            verified: false,
          });
        }
      }
    } catch {
      // On batch failure, mark all as unverified
      for (const comp of batchComps) {
        competitorListings.push({ name: comp.name, content: "", verified: false });
      }
    }
  }

  // ============================================================
  // Wave 2: Retailer reviews + forum mining (5 parallel searches)
  // ============================================================
  onProgress(`Analyzing ${retailerName} reviews and forums...`, 0.2);

  const wave2Queries = [
    { query: `site:${retailerDomain} "${productName}" reviews`, sourceType: "reviews" as const },
    { query: `"${retailerName}" "${primaryCategory}" buying guide 2025 2026`, sourceType: "guides" as const },
    { query: `"${productName}" review unboxing "after 6 months" OR "first impressions"`, sourceType: "articles" as const },
    { query: `"${productName}" OR "${primaryCategory}" forum discussion recommendation why buy`, sourceType: "forums" as const },
    { query: `"${primaryCategory}" "${retailerName}" best seller popular trending`, sourceType: "reviews" as const },
  ];

  const wave2Results = await tavilySearchBatch(
    wave2Queries.map((q) => ({
      query: q.query,
      maxResults: 6,
      includeRawContent: true,
    }))
  );

  // ============================================================
  // Wave 3: Competitor intelligence on this retailer (4 parallel)
  // ============================================================
  onProgress(`Researching competitor presence on ${retailerName}...`, 0.35);

  const wave3Queries: { query: string; sourceType: ResearchQuery["sourceType"] }[] = topCompetitors.slice(0, 2).map((comp) => ({
    query: `"${comp.name}" "${retailerName}" reviews comparison vs`,
    sourceType: "reviews" as const,
  }));
  wave3Queries.push({
    query: `best ${primaryCategory} ${retailerName} 2025 2026 ranked`,
    sourceType: "guides" as const,
  });
  wave3Queries.push({
    query: `site:reddit.com "${productName}" vs "${topCompetitors[0]?.name || primaryCategory}" which better`,
    sourceType: "reddit" as const,
  });

  const wave3Results = await tavilySearchBatch(
    wave3Queries.map((q) => ({
      query: q.query,
      maxResults: 5,
      includeRawContent: true,
    }))
  );

  // Combine all responses
  const allResponses = [...wave1Results, ...wave2Results, ...wave3Results];
  const allQueryMeta = [...wave1Queries, ...wave2Queries, ...wave3Queries];

  // ============================================================
  // Claude Call 1: Evidence Extraction
  // ============================================================
  onProgress(`Extracting shopper behavior patterns for ${retailerName}...`, 0.5);

  const allSearchFormatted = formatSearchResults(allResponses);
  const evidence = await callClaudeJSON<Record<string, unknown>>({
    systemPrompt: EVIDENCE_EXTRACTION_SYSTEM_PROMPT,
    userPrompt: buildEvidenceExtractionPrompt(
      productName,
      retailerName,
      categoryNames.join(", "),
      allSearchFormatted
    ),
    maxTokens: 8192,
    cacheSystemPrompt: true,
  });
  const extractedQuoteCount = (evidence.quotes as unknown[])?.length ?? 0;

  // ============================================================
  // Claude Call 2: Persona Synthesis
  // ============================================================
  onProgress(`Building ${retailerName} shopper personas...`, 0.7);

  const productSummary = JSON.stringify(
    {
      productName: productResearch.productName,
      brand: productResearch.brand,
      keyFeatures: productResearch.keyFeatures,
      pricing: productResearch.pricing,
      competitors: productResearch.competitors.slice(0, 5).map((c) => ({
        name: c.name,
        brand: c.brand,
        priceRange: c.priceRange,
        keyDifferentiator: c.keyDifferentiator,
      })),
    },
    null,
    2
  );

  const personasData = await callClaudeJSON<RetailerPersonas>({
    systemPrompt: PERSONA_SYNTHESIS_SYSTEM_PROMPT,
    userPrompt: buildPersonaSynthesisPrompt(
      productName,
      productResearch.brand,
      retailerName,
      productSummary,
      JSON.stringify(evidence, null, 2),
      selectedCategories,
      Object.fromEntries(
        productResearch.categories
          .filter(c => c.searchTerms?.length > 0)
          .map(c => [c.name, c.searchTerms])
      )
    ),
    maxTokens: 8192,
    cacheSystemPrompt: true,
  });

  // ============================================================
  // Claude Calls 3+4: Query Expansion + Evidence Expansion (parallel)
  // Run dedicated calls to generate 100 queries per persona
  // and extract deep evidence from all search results.
  // ============================================================
  onProgress(`Expanding queries and evidence for ${retailerName}...`, 0.8);

  const categoryNames_str = categoryNames.join(", ");

  // Query expansion: one call per persona, all in parallel
  const queryExpansionPromises = personasData.personas.map((p) => {
    const personaSummary = JSON.stringify({
      archetypeName: p.archetypeName,
      tagline: p.tagline,
      demographics: p.demographics,
      psychographics: p.psychographics,
      shoppingBehavior: p.shoppingBehavior,
      searchQueries: p.searchQueries,
    }, null, 2);

    return callClaude({
      systemPrompt: QUERY_EXPANSION_SYSTEM_PROMPT,
      userPrompt: buildQueryExpansionPrompt(
        productName,
        retailerName,
        p.archetypeName,
        personaSummary,
        categoryNames_str,
        retailerSearchBehavior,
        actualListingContent
      ),
      maxTokens: 8192,
      cacheSystemPrompt: true,
    }).then((raw) => {
      try {
        const data = extractJSON<{
          queries: { query: string; estimatedVolume: string; intent: string; category?: string }[];
        }>(raw);
        return { personaId: p.id, queries: data.queries ?? [] };
      } catch {
        return { personaId: p.id, queries: [] };
      }
    }).catch(() => ({ personaId: p.id, queries: [] }));
  });

  // Evidence expansion: one call PER persona, all in parallel
  const evidenceExpansionPromises = personasData.personas.map((p) => {
    const pSummary = JSON.stringify({
      archetypeName: p.archetypeName,
      tagline: p.tagline,
      demographics: p.demographics,
      psychographics: p.psychographics,
      shoppingBehavior: p.shoppingBehavior,
    }, null, 2);

    return callClaude({
      systemPrompt: EVIDENCE_EXPANSION_SYSTEM_PROMPT,
      userPrompt: buildEvidenceExpansionPrompt(
        productName,
        retailerName,
        p.archetypeName,
        pSummary,
        allSearchFormatted,
        actualListingContent
      ),
      maxTokens: 8192,
      cacheSystemPrompt: true,
    }).then((raw) => {
      try {
        const data = extractJSON<{
          evidence: { text: string; source: string; url: string; relevance: string; evidenceType?: string }[];
        }>(raw);
        return { personaId: p.id, evidence: data.evidence ?? [] };
      } catch {
        return { personaId: p.id, evidence: [] };
      }
    }).catch(() => ({ personaId: p.id, evidence: [] }));
  });

  // Run expansion calls with limited concurrency (max 3 at a time)
  async function runBatch<T>(tasks: Promise<T>[], batchSize: number): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    return results;
  }

  // Run queries first (batches of 3), then evidence (batches of 3)
  // Run all expansion calls with higher concurrency for speed
  const queryResults = await runBatch(queryExpansionPromises, 5);
  const evidenceResults = await runBatch(evidenceExpansionPromises, 5);

  // FIX 8: Collect all real URLs from Tavily results for validation
  const realTavilyUrls = new Set<string>();
  for (const resp of allResponses) {
    for (const r of resp.results) {
      if (r.url) realTavilyUrls.add(r.url);
    }
  }

  // Flatten evidence results, filtering out fabricated URLs
  const expandedEvidence = evidenceResults.flatMap(({ personaId, evidence }) =>
    evidence
      .filter(e => {
        // Keep if URL matches a real Tavily result, or if URL is empty (inferred)
        if (!e.url) return true;
        // Check if any Tavily URL contains this URL or vice versa (partial match for URL variations)
        return Array.from(realTavilyUrls).some(realUrl =>
          realUrl.includes(e.url.split("?")[0]) || e.url.includes(realUrl.split("?")[0])
        );
      })
      .map(e => ({ ...e, personaId }))
  );

  // Merge expanded queries into the SearchQuery format
  const allExpandedQueries: SearchQuery[] = [];
  for (const { personaId, queries } of queryResults) {
    for (const q of queries) {
      allExpandedQueries.push({
        query: q.query,
        estimatedVolume: (q.estimatedVolume as SearchQuery["estimatedVolume"]) ?? "medium",
        volumeReasoning: "",
        intent: (q.intent as SearchQuery["intent"]) ?? "commercial",
        personaIds: [personaId],
        retailerSpecific: q.query.toLowerCase().includes(retailerName.toLowerCase()),
      });
    }
  }

  // Merge base queries from persona synthesis
  const baseQueries: SearchQuery[] = personasData.searchQueryAnalysis.flatMap(
    (cluster) => cluster.queries
  );

  // Deduplicate: expanded queries take priority, add base queries that aren't duplicates
  const seenQueries = new Set(allExpandedQueries.map(q => q.query.toLowerCase()));
  for (const bq of baseQueries) {
    if (!seenQueries.has(bq.query.toLowerCase())) {
      allExpandedQueries.push(bq);
      seenQueries.add(bq.query.toLowerCase());
    }
  }

  // Merge expanded evidence into personas with CROSS-PERSONA deduplication
  // Track globally: if the same quote appears for multiple personas, keep it
  // only for the first persona (by order). This prevents evidence overlap.
  const globalSeenQuotes = new Set<string>();

  for (const persona of personasData.personas) {
    const personaEvidence = expandedEvidence.filter((e) => e.personaId === persona.id);
    const existingTexts = new Set(persona.sourceEvidence.map((s) => s.text.toLowerCase().slice(0, 50)));

    // Also mark existing evidence as globally seen
    for (const s of persona.sourceEvidence) {
      globalSeenQuotes.add(s.text.toLowerCase().slice(0, 50));
    }

    for (const e of personaEvidence) {
      const key = e.text.toLowerCase().slice(0, 50);
      // Skip if already used by this persona OR by another persona
      if (existingTexts.has(key) || globalSeenQuotes.has(key)) continue;
      persona.sourceEvidence.push({
        text: e.text,
        source: e.source,
        url: e.url,
        relevance: e.relevance,
      });
      existingTexts.add(key);
      globalSeenQuotes.add(key);
    }
  }

  // Also merge expanded queries into persona.searchQueries
  for (const { personaId, queries } of queryResults) {
    const persona = personasData.personas.find((p) => p.id === personaId);
    if (persona) {
      const existingLower = new Set(persona.searchQueries.map(q => q.toLowerCase()));
      for (const q of queries) {
        if (!existingLower.has(q.query.toLowerCase())) {
          persona.searchQueries.push(q.query);
          existingLower.add(q.query.toLowerCase());
        }
      }
    }
  }

  // Post-process: spread overlapping clusters apart (min 0.3 Euclidean distance)
  const coords = personasData.personas.map(p => p.clusterCoordinates);
  for (let iter = 0; iter < 20; iter++) {
    let moved = false;
    for (let i = 0; i < coords.length; i++) {
      for (let j = i + 1; j < coords.length; j++) {
        const dx = coords[i].priceVsQuality - coords[j].priceVsQuality;
        const dy = coords[i].convenienceVsControl - coords[j].convenienceVsControl;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.3 && dist > 0) {
          const push = (0.3 - dist) / 2 + 0.02;
          const nx = dx / dist;
          const ny = dy / dist;
          coords[i].priceVsQuality = Math.max(-1, Math.min(1, coords[i].priceVsQuality + nx * push));
          coords[i].convenienceVsControl = Math.max(-1, Math.min(1, coords[i].convenienceVsControl + ny * push));
          coords[j].priceVsQuality = Math.max(-1, Math.min(1, coords[j].priceVsQuality - nx * push));
          coords[j].convenienceVsControl = Math.max(-1, Math.min(1, coords[j].convenienceVsControl - ny * push));
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // Post-process: differentiate categories when all personas have the same set
  if (selectedCategories.length >= 2) {
    const allCatSets = personasData.personas.map(p => JSON.stringify((p.relevantCategories ?? []).sort()));
    const allSame = allCatSets.every(c => c === allCatSets[0]);
    if (allSame && personasData.personas.length >= 2) {
      // Distribute categories — assign each persona a PRIMARY category based on their position
      // Price-driven personas → broader/budget categories, Quality-driven → specific/premium categories
      const sortedByPrice = [...personasData.personas].sort(
        (a, b) => a.clusterCoordinates.priceVsQuality - b.clusterCoordinates.priceVsQuality
      );
      const midpoint = Math.floor(sortedByPrice.length / 2);
      for (let pi = 0; pi < sortedByPrice.length; pi++) {
        const persona = sortedByPrice[pi];
        if (pi < midpoint) {
          // Price-driven half: primary = first selected category (usually broader)
          persona.relevantCategories = [selectedCategories[0]];
        } else {
          // Quality-driven half: primary = second selected category (usually more specific)
          persona.relevantCategories = [selectedCategories[Math.min(1, selectedCategories.length - 1)]];
        }
        // Gift buyers and convenience seekers get all categories
        const lowerName = persona.archetypeName.toLowerCase();
        if (lowerName.includes('gift') || lowerName.includes('convenience') || lowerName.includes('beginner')) {
          persona.relevantCategories = [...selectedCategories];
        }
      }
    }
  }

  // Post-process: ensure at least one persona in bottom-left quadrant (price-driven + convenience)
  const hasBottomLeft = coords.some(c => c.priceVsQuality < -0.3 && c.convenienceVsControl < -0.3);
  if (!hasBottomLeft && coords.length >= 3) {
    // Find the most price-driven persona and push them into bottom-left
    const mostPriceDriven = coords.reduce((best, c, i) => c.priceVsQuality < coords[best].priceVsQuality ? i : best, 0);
    coords[mostPriceDriven].priceVsQuality = Math.min(coords[mostPriceDriven].priceVsQuality, -0.4);
    coords[mostPriceDriven].convenienceVsControl = Math.min(coords[mostPriceDriven].convenienceVsControl, -0.4);
  }

  // Build clustering data
  const clusteringData: ClusteringData = {
    dimensions: { x: "Price vs Quality", y: "Convenience vs Control" },
    points: personasData.personas.map((p) => ({
      personaId: p.id,
      x: p.clusterCoordinates.priceVsQuality,
      y: p.clusterCoordinates.convenienceVsControl,
      size: p.clusterCoordinates.estimatedSegmentSize,
      label: p.archetypeName,
    })),
  };

  // Collect all source evidence
  const allSources: SourceQuote[] = personasData.personas.flatMap(
    (p) => p.sourceEvidence
  );

  // Build research stats — enrich with evidence source URLs
  const personaIds = personasData.personas.map((p) => p.id);
  const totalQuotes = allSources.length;
  const researchStats = buildResearchStats(allResponses, allQueryMeta, totalQuotes, personaIds);

  // Add unique evidence URLs that weren't already in Tavily results
  // Deduplicate across ALL personas — same URL only counted once
  const existingUrls = new Set(researchStats.scannedPages.map(p => p.url));
  const seenEvidenceUrls = new Set<string>();
  for (const source of allSources) {
    if (source.url && !existingUrls.has(source.url) && !seenEvidenceUrls.has(source.url)) {
      seenEvidenceUrls.add(source.url);
      existingUrls.add(source.url);
      const sourceType = classifySourceType(source.url);
      researchStats.scannedPages.push({ title: source.source, url: source.url, sourceType });
      researchStats.breakdown[sourceType]++;
    }
  }
  researchStats.totalSourcesScanned = researchStats.scannedPages.length;
  // Add evidence text to word count — deduplicate by text to avoid counting same quote from multiple personas
  const seenTexts = new Set<string>();
  let extraWords = 0;
  for (const s of allSources) {
    const key = s.text.slice(0, 50).toLowerCase();
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      extraWords += s.text.split(/\s+/).length;
    }
  }
  researchStats.totalWordsAnalyzed += extraWords;

  onProgress(`Personas complete for ${retailerName}`, 1);

  return {
    personas: personasData,
    searchQueries: allExpandedQueries,
    actualListingContent,
    actualRating,
    competitorListings,
    clusteringData,
    sources: allSources,
    researchStats,
  };
}
