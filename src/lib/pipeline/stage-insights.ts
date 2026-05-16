import { callClaudeJSON } from "../anthropic";
import {
  INSIGHTS_SYSTEM_PROMPT,
  buildInsightsPrompt,
} from "../prompts/insights";
import { calculateReadinessScore } from "../readiness-score";
import type { ProductResearch, RetailerPersonas, RetailerInsights } from "../types";

export async function runInsightGeneration(
  productResearch: ProductResearch,
  personas: RetailerPersonas,
  retailerName: string,
  competitorListings: { name: string; content: string; verified: boolean }[],
  retailerSearchBehavior: string,
  actualListingContent: string | null,
  onProgress: (message: string, progress: number) => void
): Promise<RetailerInsights> {
  onProgress(`Analyzing competitive positioning for ${retailerName}...`, 0);

  const productSummary = JSON.stringify(
    {
      productName: productResearch.productName,
      brand: productResearch.brand,
      keyFeatures: productResearch.keyFeatures,
      pricing: productResearch.pricing,
      categories: productResearch.categories.map((c) => c.name),
      competitors: productResearch.competitors.map((c) => ({
        name: c.name,
        brand: c.brand,
        priceRange: c.priceRange,
        keyDifferentiator: c.keyDifferentiator,
        strengths: c.strengthsVsProduct,
        weaknesses: c.weaknessesVsProduct,
      })),
    },
    null,
    2
  );

  const personasSummary = JSON.stringify(
    {
      retailerCharacteristics: personas.retailerCharacteristics,
      personas: personas.personas.map((p) => ({
        id: p.id,
        archetypeName: p.archetypeName,
        tagline: p.tagline,
        demographics: p.demographics,
        psychographics: p.psychographics,
        shoppingBehavior: p.shoppingBehavior,
        searchQueries: p.searchQueries.slice(0, 50),
        contentPreferences: p.contentPreferences,
        painPoints: p.psychographics.painPoints,
      })),
    },
    null,
    2
  );

  // Add retailer-specific context
  const retailerContext = retailerSearchBehavior
    ? `\n\n=== HOW SHOPPERS SEARCH ON ${retailerName.toUpperCase()} ===\n${retailerSearchBehavior}`
    : "";
  const listingContext = actualListingContent
    ? `\n\n=== ACTUAL CURRENT PRODUCT LISTING ON ${retailerName.toUpperCase()} ===\n${actualListingContent.slice(0, 1500)}\n\nUse this to assess what's already covered vs what's missing.`
    : "";

  const competitorNames = productResearch.competitors.map(c => c.name);

  const verifiedListings = competitorListings.filter(cl => cl.verified && cl.content.length > 50);
  const unverifiedNames = competitorListings.filter(cl => !cl.verified || cl.content.length <= 50).map(cl => cl.name);
  const competitorListingContext = verifiedListings.length > 0
    ? "\n\n=== ACTUAL COMPETITOR LISTINGS ON " + retailerName.toUpperCase() + " ===\n" +
      verifiedListings.map(cl => `${cl.name} [VERIFIED - actual listing scraped]:\n${cl.content.slice(0, 1500)}`).join("\n\n") +
      (unverifiedNames.length > 0 ? `\n\nNOTE: Listings NOT FOUND for: ${unverifiedNames.join(", ")}. For these competitors, base your analysis on general market knowledge and clearly note that the listing was not verified.` : "")
    : "";

  const insights = await callClaudeJSON<RetailerInsights>({
    systemPrompt: INSIGHTS_SYSTEM_PROMPT,
    userPrompt: buildInsightsPrompt(
      productResearch.productName,
      productResearch.brand,
      retailerName,
      productSummary + competitorListingContext + retailerContext + listingContext,
      personasSummary,
      competitorNames
    ),
    maxTokens: 16384,
    cacheSystemPrompt: true,
  });

  // Tag battlecards and content gaps with verified status
  const verifiedCompetitors = new Set(
    competitorListings.filter(cl => cl.verified && cl.content.length > 50).map(cl => cl.name.toLowerCase())
  );

  if (insights.competitivePositioning?.vsCompetitors) {
    insights.competitivePositioning.vsCompetitors = insights.competitivePositioning.vsCompetitors.map(bc => ({
      ...bc,
      verified: verifiedCompetitors.has(bc.competitorName.toLowerCase()),
    }));
  }

  if (insights.competitorContentGaps) {
    insights.competitorContentGaps = insights.competitorContentGaps.map(gap => ({
      ...gap,
      verified: verifiedCompetitors.has(gap.competitorName.toLowerCase()),
    }));
  }

  // Calculate readiness score against actual listing content
  insights.contentReadiness = calculateReadinessScore(insights, actualListingContent ?? undefined);

  onProgress(`Insights complete for ${retailerName}`, 1);
  return insights;
}
