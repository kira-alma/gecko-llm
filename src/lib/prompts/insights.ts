export const INSIGHTS_SYSTEM_PROMPT = `You are a competitive intelligence analyst for retail products at GeckoLLM.

Given shopper personas, their search queries, and competitor data for a specific retailer, produce deep strategic insights that a brand manager can act on immediately.

RULES:
1. Every insight must reference specific persona data or competitive data. No generic advice.
2. Content gaps must identify WHO is underserved and WHAT specific content would serve them.
3. Messaging angles must map to specific personas with proof points.
4. Recommendations must be prioritized by expected impact.
5. Competitive positioning must account for THIS RETAILER'S specific audience.
6. Pain point fixes must draw a direct line from shopper problem to content solution.
7. Content readiness scoring must be honest — most products score 30-60%, not 80%+.`;

export function buildInsightsPrompt(
  productName: string,
  brand: string,
  retailerName: string,
  productResearchSummary: string,
  personasData: string,
  competitorNames?: string[]
): string {
  const competitorInstruction = competitorNames?.length
    ? `\nCRITICAL — COMPETITORS TO ANALYZE: ${competitorNames.join(", ")}
You MUST create a battlecard (vsCompetitors) AND a content gap (competitorContentGaps) for EVERY competitor listed above. Do not skip any. Do not merge them. One entry per competitor in each section.`
    : "";
  return `PRODUCT: "${productName}" by ${brand}
RETAILER: ${retailerName}${competitorInstruction}

=== PRODUCT RESEARCH ===
${productResearchSummary}

=== SHOPPER PERSONAS FOR ${retailerName.toUpperCase()} ===
${personasData}

Generate comprehensive strategic insights as JSON. Include ALL of the following sections:

{
  "retailerName": "${retailerName}",

  "competitivePositioning": {
    "summary": "2-3 sentence positioning statement for this retailer",
    "vsCompetitors": [
      {
        "competitorName": "MUST match one of the competitors listed above",
        "positioningStatement": "how to position against this competitor here",
        "keyBattleground": "what the decision comes down to",
        "winStrategy": "how to win",
        "mostRelevantPersonas": ["persona-1", "persona-2 — which personas are most likely to cross-shop this competitor"]
      }
    ],
    "uniqueSellingPoints": ["key strength for this retailer's audience"],
    "vulnerabilities": ["where competitors have an edge"]
  },

  "contentGaps": [
    {
      "gap": "what's missing",
      "importance": "critical | high | medium",
      "targetPersonas": ["persona-1"],
      "recommendation": "what content to create"
    }
  ],

  "messagingAngles": [
    {
      "angle": "messaging theme name",
      "targetPersonas": ["persona-1"],
      "emotionalHook": "the emotional driver",
      "proofPoints": ["proof point from research"],
      "channelFit": ["product page", "social", "ads"]
    }
  ],

  "recommendations": [
    {
      "priority": 1,
      "action": "specific action",
      "rationale": "why, citing persona data",
      "expectedImpact": "what this achieves",
      "personaAlignment": ["persona-1"]
    }
  ],

  "searchJourney": {
    "stages": [
      {
        "stage": "awareness",
        "label": "Awareness",
        "queryCount": 25,
        "exampleQueries": ["best coffee maker", "types of espresso machines"],
        "dropoffInsight": "what causes shoppers to drop off or not progress from this stage"
      },
      {
        "stage": "research",
        "label": "Research",
        "queryCount": 35,
        "exampleQueries": ["nespresso vertuo review", "is [product] worth it"],
        "dropoffInsight": "insight about research-stage behavior"
      },
      {
        "stage": "comparison",
        "label": "Comparison",
        "queryCount": 25,
        "exampleQueries": ["[product] vs [competitor]", "best [category] under $X"],
        "dropoffInsight": "insight about comparison-stage behavior"
      },
      {
        "stage": "purchase_intent",
        "label": "Purchase Intent",
        "queryCount": 15,
        "exampleQueries": ["[product] ${retailerName} price", "[product] coupon"],
        "dropoffInsight": "insight about purchase-stage behavior"
      }
    ]
  },

  "painPointFixes": [
    {
      "painPoint": "specific pain point from persona data",
      "mentionCount": 14,
      "currentCoverage": "covered | partial | missing",
      "contentFix": "exact content to add or change",
      "placement": "where to put it (bullet #2, A+ section, FAQ, etc.)",
      "personaIds": ["persona-1", "persona-3"]
    }
  ],

  "competitorContentGaps": [
    {
      "competitorName": "MUST match one of the competitors listed above — create one entry per competitor",
      "theirStrength": "what their listing does well that ours doesn't",
      "ourGap": "the specific gap in our content",
      "fixAction": "exact fix to close the gap"
    }
  ],

  "seasonalSignals": [
    {
      "signal": "description of the seasonal/trending pattern",
      "type": "seasonal | evergreen | trending",
      "timing": "when this signal peaks",
      "queryShare": "estimated % of queries",
      "recommendation": "what to do about it"
    }
  ],

  "objectionMap": [
    {
      "objection": "the specific hesitation or concern shoppers have",
      "severity": "high | medium | low",
      "personaIds": ["persona-1"],
      "frequency": "how often this objection appears in discussions",
      "rebuttal": "the factual rebuttal or reframing",
      "placement": "where to address this (bullet, FAQ, A+ content, ad copy, review response)",
      "contentExample": "exact copy to add, e.g. 'Easy 3-step cleaning in under 60 seconds'"
    }
  ],

  "pricePerception": {
    "overallPerception": "overpriced | fair | good_value | premium_justified",
    "perceptionSummary": "2-3 sentence summary of how shoppers perceive the price",
    "priceSignals": [
      {
        "signal": "specific price-related signal from shopper discussions, e.g. 'shoppers frequently mention $X as a threshold'",
        "sentiment": "positive | negative | neutral",
        "frequency": "how often this signal appears"
      }
    ],
    "perPersona": [
      {
        "personaId": "persona-1",
        "perception": "how this persona perceives the price",
        "reframingStrategy": "how to reframe the price for this persona, e.g. 'emphasize cost-per-cup vs cafe visits'"
      }
    ],
    "vsCompetitorPricing": [
      {
        "competitorName": "name",
        "theirPrice": "their price range",
        "perception": "how shoppers compare the prices",
        "strategy": "how to position our price against theirs"
      }
    ]
  },

  "reviewStrategy": {
    "idealReviewProfile": "what the ideal set of reviews looks like to convert the most shoppers",
    "reviewThemes": [
      {
        "theme": "review topic that most influences purchase decisions",
        "targetPersonaIds": ["persona-1"],
        "importance": "critical | high | medium",
        "exampleReview": "what an ideal review covering this theme would say (2-3 sentences)"
      }
    ],
    "negativeReviewResponses": [
      {
        "complaintTheme": "common negative review topic",
        "frequency": "how common this complaint is",
        "responseTemplate": "professional response template that addresses the concern and reassures future buyers"
      }
    ]
  },

  "keywordGaps": [
    {
      "keyword": "specific keyword or phrase from shopper queries",
      "searchVolume": "high | medium | low",
      "personaIds": ["persona-1"],
      "currentPresence": "missing | weak | partial",
      "recommendedPlacement": "where to add it (title, bullet, description, backend, A+ content)",
      "priority": "critical | high | medium"
    }
  ]
}

Generate: ONE battlecard per competitor AND one competitorContentGap per competitor (cover ALL competitors in both sections — do not skip any), 4+ content gaps, 3+ messaging angles, 5+ recommendations, 4 search journey stages, 6+ pain point fixes, 4+ seasonal signals, 8+ objections, 5+ price signals with per-persona and per-competitor pricing analysis, 6+ review themes with 4+ negative review responses, and 15+ keyword gaps.

Be specific and actionable throughout. Return ONLY the JSON object.`;
}
