export const RESEARCH_SYSTEM_PROMPT = `You are a retail product research analyst for GeckoLLM, an AI-powered retail intelligence platform.

You analyze products to identify their complete category taxonomy, competitive landscape, and market positioning.

Your analysis must be:
- SPECIFIC: Use exact prices, model names, feature specifications found in the search data
- EXHAUSTIVE on categories: A product can belong to many categories. A coffee maker belongs in "coffee makers", "espresso machines", "pod coffee systems", "kitchen appliances", "small appliances", "gift ideas" etc.
- HONEST about confidence: If search results are thin, say so rather than fabricating data

Always cite which search result informed each data point.`;

export function buildResearchPrompt(
  productName: string,
  searchResults: string
): string {
  return `Analyze the following product based on web search results.

PRODUCT: "${productName}"

=== SEARCH RESULTS ===
${searchResults}

Produce a JSON object with this exact schema:
{
  "productName": "exact product name",
  "normalizedName": "canonical/clean product name",
  "brand": "brand name",
  "description": "2-3 sentence product summary",
  "keyFeatures": ["feature 1", "feature 2", ...],
  "pricing": {
    "msrp": "$XX.XX",
    "typicalRange": "$XX - $XX"
  },
  "categories": [
    {
      "name": "category name",
      "relevance": "primary" | "secondary" | "adjacent",
      "searchTerms": ["how shoppers search for this category"]
    }
  ],
  "competitors": [
    {
      "name": "competitor product name",
      "brand": "brand",
      "priceRange": "$XX - $XX",
      "keyDifferentiator": "what makes it different",
      "strengthsVsProduct": ["strength 1"],
      "weaknessesVsProduct": ["weakness 1"]
    }
  ]
}

CRITICAL — COMPETITOR SELECTION:
- Competitors must be from DIFFERENT brands than the product. If the product is a Breville, do NOT list other Breville models as competitors. Those are alternatives within the same brand, not competitors.
- Prioritize competitors from rival brands that a shopper would cross-shop against this product.
- Include at most 1-2 same-brand alternatives (clearly marked), but the majority (at least 5) must be from different brands.
- Cover a range: direct competitors (similar price/features), aspirational competitors (premium), and budget alternatives.

Find at least 7 competitors (at least 5 from different brands) and at least 4 categories. Return ONLY the JSON object.`;
}

export function buildResearchRefinementPrompt(
  previousAnalysis: string,
  additionalResults: string
): string {
  return `You previously analyzed a product and identified initial competitors and categories. You now have deeper research results. MERGE this with the previous analysis:
- Add any new competitors found — prioritize DIFFERENT BRANDS, not same-brand variants
- If the competitor list is dominated by same-brand products, replace them with cross-brand competitors
- Refine pricing and feature details
- Strengthen or correct positioning assessments
- Fill gaps noted in the initial analysis

PREVIOUS ANALYSIS:
${previousAnalysis}

=== ADDITIONAL SEARCH RESULTS ===
${additionalResults}

Produce the COMPLETE, MERGED analysis as JSON matching the same schema. This is the final version. Return ONLY the JSON object.`;
}
