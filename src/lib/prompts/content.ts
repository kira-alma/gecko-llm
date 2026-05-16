export function buildMockPageSystemPrompt(retailerName: string, pageLayout: string, voiceNotes?: string): string {
  const voiceContext = voiceNotes
    ? `\n\nRETAILER VOICE & TONE:\n${voiceNotes}\n\nYour content MUST match this voice. ${retailerName}'s listings have a distinctive feel — replicate it.`
    : "";
  return `You are an expert e-commerce product page designer for ${retailerName} at GeckoLLM.

You create product detail page content that follows the exact conventions of ${retailerName}'s listings.

${pageLayout}${voiceContext}

CRITICAL: For every section of the page, include an annotation explaining WHY this content was chosen, which persona it targets, and which insight drove the decision.

Your output must feel authentic to ${retailerName}'s platform — someone familiar with ${retailerName} should look at the content and immediately recognize the style.`;
}

export function buildMockPagePrompt(
  productName: string,
  brand: string,
  retailerName: string,
  retailerSlug: string,
  productResearchSummary: string,
  personasSummary: string,
  insightsSummary: string,
  actualListingContent?: string | null
): string {
  const currentListingContext = actualListingContent
    ? `\n=== CURRENT ACTUAL LISTING ON ${retailerName.toUpperCase()} ===\n${actualListingContent.slice(0, 2000)}\n\nThis is what the product page currently looks like. Improve upon it — keep what works, fix what doesn't, and add what's missing based on the persona and insight data.\n`
    : "\nNo current listing found — create the page from scratch based on best practices.\n";
  return `PRODUCT: "${productName}" by ${brand}
RETAILER: ${retailerName}
${currentListingContext}
=== PRODUCT RESEARCH ===
${productResearchSummary}

=== SHOPPER PERSONAS ===
${personasSummary}

=== STRATEGIC INSIGHTS ===
${insightsSummary}

Create a complete product page content as JSON:
{
  "retailerSlug": "${retailerSlug}",
  "title": "optimized product title following ${retailerName} conventions",
  "subtitle": "subtitle or secondary line if applicable",
  "price": "$XX.XX",
  "rating": { "stars": 4.5, "count": "1,234 ratings" },
  "bullets": [
    "bullet point 1 — benefit-forward",
    "bullet point 2",
    "bullet point 3",
    "bullet point 4",
    "bullet point 5"
  ],
  "description": "full product description following ${retailerName} style",
  "enhancedContent": "enhanced/A+ content section as HTML string with inline styles for layout. Include comparison sections, feature highlights, lifestyle content.",
  "comparisonTable": {
    "headers": ["Feature", "Our Product", "Competitor A", "Competitor B"],
    "rows": [
      { "product": "feature name", "values": ["our value", "comp A value", "comp B value"] }
    ]
  },
  "annotations": [
    {
      "sectionId": "title",
      "sectionName": "Product Title",
      "reasoning": "why this title was crafted this way",
      "personaTarget": ["persona-1"],
      "sourceInsights": ["which insight drove this"]
    },
    {
      "sectionId": "bullets",
      "sectionName": "Key Features / Bullets",
      "reasoning": "why these bullets and this ordering",
      "personaTarget": ["persona-1", "persona-2"],
      "sourceInsights": ["insight reference"]
    },
    {
      "sectionId": "description",
      "sectionName": "Product Description",
      "reasoning": "tone and content choices",
      "personaTarget": ["persona-2"],
      "sourceInsights": ["insight reference"]
    },
    {
      "sectionId": "enhanced",
      "sectionName": "Enhanced / A+ Content",
      "reasoning": "visual and content strategy",
      "personaTarget": ["persona-1", "persona-3"],
      "sourceInsights": ["insight reference"]
    }
  ],
  "designNotes": "overall design rationale for this retailer's audience"
}

Return ONLY the JSON object.`;
}

export const CAMPAIGN_SYSTEM_PROMPT = `You are a retail marketing strategist and social media copywriter at GeckoLLM.

You create:
1. CAMPAIGN BRIEFS: Targeted marketing plans per persona segment. Each brief must be specific enough that a marketing team could execute it without further research.
2. SOCIAL AD COPY: Platform-specific ad variations. Facebook = longer narrative. Instagram = visual-first with concise copy. TikTok = hook-driven, casual. Pinterest = aspirational, discovery-oriented.

CRITICAL — RETAILER-SPECIFIC TACTICS:
Every campaign brief and ad MUST reference tactics specific to the retailer platform:
- Amazon: Sponsored Products, Sponsored Brands, A+ Content promotion, Amazon Posts, Subscribe & Save, Lightning Deals, Amazon Live, Vine reviews, search ranking (A9/COSMO algorithm)
- Walmart: Walmart Connect ads, Walmart+ promotions, pickup/delivery messaging, Rollback pricing, shelf placement tie-ins
- Target: Target Circle offers, Target Plus marketplace, Roundel (Target's ad platform), Drive Up/Order Pickup messaging, seasonal endcap tie-ins, Target registry
- Costco: Member-only value messaging, warehouse demo events, Costco.com vs in-store strategy, bundle/multipack positioning
- Best Buy: Totaltech membership, Geek Squad tie-ins, price match guarantee, open-box positioning, expert review program

Do NOT write generic campaigns that could apply to any retailer. Each brief must name specific retailer platform features, ad products, and shopper behaviors unique to that retailer.

Every piece of content must trace back to persona data and research insights.`;

export function buildCampaignPrompt(
  productName: string,
  brand: string,
  retailerName: string,
  personasSummary: string,
  insightsSummary: string,
  searchJourneySummary?: string
): string {
  const funnelContext = searchJourneySummary
    ? `\n=== SEARCH JOURNEY FUNNEL ON ${retailerName.toUpperCase()} ===\n${searchJourneySummary}\n\nUse the funnel data above to design campaigns that address the biggest drop-off stages. If most queries are in "research" but few reach "purchase intent", the campaign should push shoppers from research to conversion.\n`
    : "";
  return `PRODUCT: "${productName}" by ${brand}
RETAILER: ${retailerName}

=== PERSONAS (abbreviated) ===
${personasSummary}

=== MESSAGING ANGLES & INSIGHTS ===
${insightsSummary}
${funnelContext}

Generate marketing materials as JSON:
{
  "campaignBriefs": [
    {
      "targetPersonaId": "persona-1",
      "campaignName": "campaign name",
      "objective": "what this campaign achieves",
      "keyMessage": "the core message",
      "channels": ["channel 1", "channel 2"],
      "callToAction": "specific CTA",
      "toneGuide": "tone description",
      "reasoning": "why this campaign targets this persona with this approach"
    }
  ],
  "socialAdCopy": [
    {
      "platform": "facebook" | "instagram" | "tiktok" | "pinterest",
      "format": "carousel | single image | video script | story",
      "headline": "ad headline",
      "primaryText": "ad body copy",
      "callToAction": "CTA text",
      "imageDirection": "art direction guidance for the creative",
      "targetPersonaId": "persona-1",
      "reasoning": "why this variation works for this persona on this platform",
      "hashtags": ["#hashtag1"]
    }
  ]
}

Generate 1 campaign brief per persona (4-6 total) and 2-3 social ad copy variations per persona across different platforms (8-15 total). Return ONLY the JSON object.`;
}
