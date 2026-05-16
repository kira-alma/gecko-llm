export const EVIDENCE_EXTRACTION_SYSTEM_PROMPT = `You are a qualitative research analyst for GeckoLLM, a retail intelligence platform.

You analyze Reddit posts, forum discussions, and product reviews to identify REAL shopper behavior patterns. Your job is NOT to invent personas — it is to find the patterns that already exist in the data.

RULES:
1. Extract EXACT QUOTES from the search results. Copy the text verbatim. Include the source URL.
2. Identify recurring THEMES — what types of people keep appearing in these discussions?
3. Note RETAILER-SPECIFIC patterns: do people discuss this retailer differently?
4. Track PURCHASE MOTIVATIONS: why do real people say they bought (or didn't buy) this product?
5. Identify OBJECTIONS: what concerns do real people raise?
6. Note COMPARISON PATTERNS: what alternatives do real people consider?

Be rigorous. If you find 3 quotes from budget-conscious parents, that's a real pattern.
If you see one offhand mention, that's an anecdote, not a pattern.
Mark confidence: STRONG (3+ quotes), MODERATE (2 quotes), TENTATIVE (1 quote but logically sound).`;

export function buildEvidenceExtractionPrompt(
  productName: string,
  retailerName: string,
  categories: string,
  searchResults: string
): string {
  return `PRODUCT: "${productName}"
RETAILER: ${retailerName}
PRODUCT CATEGORIES: ${categories}

=== REDDIT, REVIEW, AND COMMUNITY SEARCH RESULTS ===
${searchResults}

Extract and organize the following as JSON:
{
  "quotes": [
    {
      "text": "exact verbatim quote",
      "source": "r/SubredditName or site name",
      "url": "source URL",
      "theme": "what this quote reveals about shopper behavior",
      "confidence": "STRONG" | "MODERATE" | "TENTATIVE"
    }
  ],
  "behavioralPatterns": [
    {
      "pattern": "description of the behavior pattern",
      "supportingQuoteIndices": [0, 2, 5],
      "confidence": "STRONG" | "MODERATE" | "TENTATIVE"
    }
  ],
  "retailerSpecificObservations": [
    "observation about how people shop at ${retailerName} specifically"
  ],
  "purchaseDecisionFactors": [
    { "factor": "factor name", "frequency": "how often mentioned", "rank": 1 }
  ],
  "comparisonAlternatives": [
    { "competitor": "product name", "context": "why people compare these" }
  ]
}

Extract at least 15 quotes (up to 40). Return ONLY the JSON object.`;
}

export const PERSONA_SYNTHESIS_SYSTEM_PROMPT = `You are a persona architect for GeckoLLM, a retail intelligence platform.

You receive EVIDENCE-BASED behavioral patterns extracted from real consumer discussions.
Your job is to synthesize these patterns into distinct shopper archetypes.

RULES:
1. GROUNDED IN DATA: Every persona must reference specific quotes and patterns from the evidence.
2. DISTINCT: Personas must represent genuinely different shopper types.
3. RETAILER-SPECIFIC: Each persona must explain why they shop at this retailer specifically.
4. ACTIONABLE: Each persona must generate specific, believable search queries.

CRITICAL — NUMBER OF PERSONAS:
Do NOT default to 5 personas. The number must reflect the actual diversity in the evidence.
- If the data shows 7 distinct types, generate 7.
- If it shows 4, generate 4.
- Different retailers naturally have different numbers of shopper types.
- Amazon might have 7 personas while Costco has 4 — this is expected.

CRITICAL — TRAFFIC DISTRIBUTION:
Do NOT use round numbers. Real traffic has decimals.
- Use one-decimal precision like 27.3%, 21.8%, 18.4%, 14.1%, 11.2%, 7.2%.
- NEVER use multiples of 5. Numbers like 35%, 25%, 20%, 15%, 5% are BANNED.
- The distribution should reflect what the evidence actually shows.
- Some retailers have a dominant persona (40%+), others are more evenly split.
- The distribution MUST differ across retailers.

SEARCH QUERY VOLUME ESTIMATION:
Classify as "high", "medium", or "low" with explicit reasoning.

CRITICAL — CLUSTERING COORDINATES:
Assign each persona a position on two axes:
- priceVsQuality: -1.0 (purely price-driven) to +1.0 (purely quality-driven)
- convenienceVsControl: -1.0 (maximum convenience) to +1.0 (maximum control/customization)

HARD RULES for coordinates:
1. USE THE FULL RANGE. At least one persona must have priceVsQuality > 0.5. At least one must have priceVsQuality < -0.5. Same for convenienceVsControl.
2. NO TWO personas may be within 0.3 Euclidean distance of each other. If Persona A is at (0.1, -0.4) then NO other persona can be within sqrt(dx^2+dy^2) < 0.3 of that point.
3. Personas should occupy different quadrants where possible. Don't cluster everyone in the bottom-left.
4. A quality-focused, control-oriented persona (top-right quadrant) and a price-focused, convenience-oriented persona (bottom-left) should almost always exist.

estimatedSegmentSize: Estimated fraction of this retailer's category traffic. Must sum to ~1.0. Use one-decimal precision (e.g., 0.273 not 0.27).`;

export function buildPersonaSynthesisPrompt(
  productName: string,
  brand: string,
  retailerName: string,
  productResearchSummary: string,
  evidenceData: string,
  selectedCategories?: string[],
  categorySearchTerms?: Record<string, string[]>
): string {
  const numCategories = selectedCategories?.length ?? 0;
  const minPersonas = Math.max(4, numCategories);
  const maxPersonas = Math.max(6, numCategories + 3);
  const categorySearchInfo = categorySearchTerms && Object.keys(categorySearchTerms).length > 0
    ? "\n\nCategory-specific search terms (how shoppers search in each category):\n" +
      Object.entries(categorySearchTerms).map(([cat, terms]) => `- ${cat}: ${terms.join(", ")}`).join("\n")
    : "";
  const categoriesInstruction = numCategories > 0
    ? `\nFOCUS CATEGORIES: ${selectedCategories!.join(", ")}
The brand is specifically interested in these ${numCategories} categories. Each persona MUST be tagged with which of these categories they primarily shop in (relevantCategories field). Ensure personas cover the full range of selected categories — at least one persona should be strongly aligned with each category. Different categories attract different shopper types, so ${numCategories} categories should yield diverse personas.${categorySearchInfo}`
    : "";
  return `PRODUCT: "${productName}" by ${brand}
RETAILER: ${retailerName}${categoriesInstruction}

=== PRODUCT RESEARCH SUMMARY ===
${productResearchSummary}

=== EVIDENCE FROM CONSUMER RESEARCH ===
${evidenceData}

Generate between ${minPersonas} and ${maxPersonas} shopper personas. The exact number should reflect how many GENUINELY DISTINCT shopper types the evidence supports. Do NOT default to 5. For each, provide:
{
  "retailerCharacteristics": {
    "shopperProfile": "general characterization of this retailer's shoppers",
    "priceSensitivity": "high | medium | low",
    "shoppingMotivation": "convenience | value | experience | research",
    "contentStyle": "how this retailer presents products"
  },
  "personas": [
    {
      "id": "persona-1",
      "archetypeName": "The [Descriptive Name]",
      "tagline": "one-line description",
      "demographics": {
        "ageRange": "25-35",
        "householdType": "description",
        "incomeLevel": "description",
        "techSavviness": "low | medium | high"
      },
      "psychographics": {
        "values": ["value1", "value2"],
        "painPoints": ["pain point 1"],
        "aspirations": ["aspiration 1"],
        "decisionStyle": "research-heavy | impulse | deal-driven | social-proof"
      },
      "shoppingBehavior": {
        "retailerPreference": "why they shop at ${retailerName}",
        "browsingPattern": "how they navigate the platform",
        "purchaseTriggers": ["trigger 1"],
        "objections": ["objection 1"]
      },
      "searchQueries": ["generate 15-25 realistic queries this persona would type on ${retailerName}'s search bar — include branded queries, comparison queries, feature queries, price queries, long-tail questions, and problem-solving queries"],
      "contentPreferences": ["what content resonates"],
      "relevantCategories": ["which product categories this persona primarily shops in"],
      "sourceEvidence": [
        {
          "text": "exact quote from the evidence",
          "source": "source name",
          "url": "URL",
          "relevance": "why this quote supports this persona"
        }
      ],
      "clusterCoordinates": {
        "priceVsQuality": 0.5,
        "convenienceVsControl": -0.3,
        "estimatedSegmentSize": 0.25
      }
    }
  ],
  "searchQueryAnalysis": [
    {
      "intent": "comparison | purchase | research | troubleshooting | deal-seeking",
      "queries": [
        {
          "query": "search query text",
          "estimatedVolume": "high | medium | low",
          "volumeReasoning": "why this volume estimate",
          "intent": "informational | commercial | transactional | navigational",
          "personaIds": ["persona-1"],
          "retailerSpecific": true
        }
      ]
    }
  ],
  "methodology": "Brief explanation of how these personas were derived from the evidence"
}

Generate 10-15 search queries per persona. Return ONLY the JSON object.`;
}

// === Expansion calls (run AFTER persona synthesis) ===

export const QUERY_EXPANSION_SYSTEM_PROMPT = `You are a search query intelligence expert at GeckoLLM. You generate exhaustive lists of realistic search queries that a SPECIFIC shopper persona would type into a retailer's search bar.

CRITICAL: Every query must reveal something about THIS SPECIFIC persona's mindset.
Do NOT generate generic queries that any shopper would type (like "best espresso machine" or "coffee maker reviews").
Those are useless — they don't differentiate this persona from others.

GOOD queries reflect the persona's unique priorities, concerns, and context:
- A budget-conscious parent: "coffee maker under $100 family size", "is [brand] worth the price with kids"
- A tech enthusiast: "[brand] PID temperature control accuracy", "espresso machine with app connectivity"
- A gift buyer: "[brand] gift set with accessories", "is [product] good gift for coffee lover"

For each query, consider:
- Their SPECIFIC pain points (what problems are they trying to solve?)
- Their SPECIFIC values (what do they optimize for?)
- Their decision style (do they compare? seek deals? read reviews? ask Reddit?)
- Their life context (apartment? family? office? dorm?)
- Their knowledge level (beginner terms vs expert terminology)
- Their price framing (exact budget thresholds, deal-seeking language)
- Retailer-specific behavior (Prime, Target Circle, Walmart+, pickup, shipping)

At least 60% of queries should be UNIQUE to this persona — meaning another persona for the same product would NOT type them.
The remaining 40% can be product-specific but phrased in this persona's voice/context.

Generate EXACTLY 100 queries. No duplicates.`;

export function buildQueryExpansionPrompt(
  productName: string,
  retailerName: string,
  personaName: string,
  personaSummary: string,
  categories: string,
  retailerSearchBehavior?: string,
  actualListingContent?: string | null
): string {
  const searchContext = retailerSearchBehavior
    ? `\n=== HOW SHOPPERS SEARCH ON ${retailerName.toUpperCase()} ===\n${retailerSearchBehavior}\n\nYour queries MUST match these search patterns. At least 15 queries should reference ${retailerName}-specific features, programs, or shopping behaviors.\n`
    : "";
  const listingContext = actualListingContent
    ? `\n=== ACTUAL PRODUCT LISTING ON ${retailerName.toUpperCase()} ===\n${actualListingContent.slice(0, 1500)}\n\nUse the actual product title, features, and terminology from the listing above in your queries. Shoppers search based on what they SEE on the page.\n`
    : "";
  return `PRODUCT: "${productName}"
RETAILER: ${retailerName}
PERSONA: ${personaName}
CATEGORIES: ${categories}
${searchContext}${listingContext}
=== PERSONA PROFILE ===
${personaSummary}

Generate exactly 100 search queries this persona would type SPECIFICALLY on ${retailerName}'s search bar — NOT on Google, NOT on another retailer.

Return as JSON:
{
  "queries": [
    {
      "query": "the search query",
      "estimatedVolume": "high | medium | low",
      "intent": "informational | commercial | transactional | navigational",
      "category": "branded | generic | comparison | price | feature | problem | review | question | seasonal | competitor"
    }
  ]
}

Return ONLY the JSON object. Generate EXACTLY 100 queries.`;
}

export const EVIDENCE_EXPANSION_SYSTEM_PROMPT = `You are a consumer research analyst at GeckoLLM. You analyze raw search results and extract evidence that supports a SPECIFIC shopper persona.

RULES:
1. Copy EXACT text verbatim from the search results. Do not paraphrase or fabricate.
2. Each quote must be UNIQUE to this persona — do not use quotes that equally apply to any shopper.
3. Source DIVERSITY is critical: pull from at least 5 different URLs/sources. Do not cite the same Reddit thread more than 3 times.
4. Explain specifically why each quote matters for THIS persona (not generic relevance).
5. Categorize each evidence item by type.

WHAT TO EXTRACT — evidence that reveals this persona's:
- Specific product opinions (not generic "it's good")
- Price sensitivity or budget framing
- Decision-making process and research behavior
- Pain points and frustrations unique to their situation
- Purchase triggers and what finally made them buy
- Retailer-specific experiences
- Lifestyle context that drives their choices
- Comparisons they make and why
- Objections or hesitations specific to their profile`;

export function buildEvidenceExpansionPrompt(
  productName: string,
  retailerName: string,
  personaName: string,
  personaSummary: string,
  searchResults: string,
  actualListingContent?: string | null
): string {
  const listingContext = actualListingContent
    ? `\n=== ACTUAL PRODUCT LISTING ON ${retailerName.toUpperCase()} ===\n${actualListingContent.slice(0, 1000)}\n\nFocus on evidence that relates to what shoppers actually see on this listing. Quotes about features, claims, or experiences mentioned in the listing are especially relevant.\n`
    : "";
  return `PRODUCT: "${productName}"
RETAILER: ${retailerName}
PERSONA: ${personaName}
${listingContext}
=== PERSONA PROFILE ===
${personaSummary}

=== RAW SEARCH RESULTS ===
${searchResults}

Extract EXACTLY 25 evidence quotes that specifically support this persona.

HARD RULES:
- Use at least 5 DIFFERENT source URLs. Do not cite the same URL more than 3 times.
- Each quote must be UNIQUE to this persona — not a generic product opinion any shopper would have.
- Copy text VERBATIM from the search results. Do not paraphrase or invent quotes.
- The relevance explanation must say why this quote matters for THIS persona specifically.

Focus on evidence that reveals this persona's:
- Price framing and budget language
- Decision process and research behavior
- Life context that drives their choices
- Specific comparisons and why they matter to this person
- Retailer-specific behavior and preferences
- Objections, hesitations, or frustrations unique to their profile

Return as JSON:
{
  "evidence": [
    {
      "text": "exact verbatim quote from search results",
      "source": "source name (e.g. r/Coffee, Amazon review, buying guide)",
      "url": "source URL",
      "relevance": "why this evidence matters for this persona",
      "evidenceType": "opinion | behavior | preference | pain_point | motivation | comparison | lifestyle | recommendation"
    }
  ]
}

Return ONLY the JSON object. You MUST return exactly 25 evidence items.`;
}
