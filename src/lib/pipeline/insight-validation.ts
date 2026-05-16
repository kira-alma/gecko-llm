import type {
  RetailerInsights,
  ShopperPersona,
  SourceQuote,
  MockProductPage,
  SearchQuery,
} from "../types";

// Funnel stage classification — order matters: check most specific first
const FUNNEL_KEYWORDS = {
  purchase_intent: [
    "price", "deal", "coupon", "discount", "buy", "order", "add to cart", "where to buy",
    "sale", "cost", "cheap", "afford", "bundle", "free shipping", "prime day", "black friday",
    "rollback", "target circle", "walmart+", "subscribe and save", "lightning deal",
    "how much", "under $", "under $", "dollars", "payment plan", "financing",
    "in stock", "delivery", "pickup", "ship", "promo code",
  ],
  comparison: [
    " vs ", "versus", "compared", "alternative", "better than", "difference between",
    "switch from", "instead of", "competitor", "or ", " vs.", "which one",
    "which should", "choose between", "head to head",
  ],
  research: [
    "review", "worth it", "pros cons", "honest", "opinion", "experience", "recommend",
    "rating", "reliable", "reddit", "youtube", "unboxing", "after 6 months",
    "long term", "first impressions", "hands on", "test", "performance",
    "durability", "noise", "suction", "battery life", "how long",
    "problems", "issues", "complaints", "broken", "defect", "warranty",
  ],
  awareness: [
    "what is", "types of", "how to", "guide", "introduction", "beginner",
    "learn", "overview", "explain", "how does", "do i need",
  ],
};

// Seasonal keyword patterns
const SEASONAL_KEYWORDS: Record<string, { type: "seasonal" | "trending"; timing: string; keywords: string[] }> = {
  holiday_gift: { type: "seasonal", timing: "November-December", keywords: ["gift", "christmas", "holiday", "present", "stocking"] },
  black_friday: { type: "seasonal", timing: "November", keywords: ["black friday", "cyber monday", "deal", "doorbuster"] },
  fathers_day: { type: "seasonal", timing: "June", keywords: ["father", "dad", "father's day"] },
  mothers_day: { type: "seasonal", timing: "May", keywords: ["mother", "mom", "mother's day"] },
  back_to_school: { type: "seasonal", timing: "August-September", keywords: ["dorm", "college", "back to school", "student", "apartment"] },
  new_year: { type: "seasonal", timing: "January", keywords: ["new year", "resolution", "upgrade", "fresh start"] },
  summer: { type: "seasonal", timing: "June-August", keywords: ["summer", "iced", "cold brew", "cold", "outdoor"] },
  trending: { type: "trending", timing: "Ongoing", keywords: ["2025", "2026", "new", "latest", "just released", "updated"] },
};

function classifyQueryToStage(query: string): "awareness" | "research" | "comparison" | "purchase_intent" {
  const q = query.toLowerCase();
  // Check most specific first — purchase intent, then comparison, then research
  if (FUNNEL_KEYWORDS.purchase_intent.some(kw => q.includes(kw))) return "purchase_intent";
  if (FUNNEL_KEYWORDS.comparison.some(kw => q.includes(kw))) return "comparison";
  if (FUNNEL_KEYWORDS.research.some(kw => q.includes(kw))) return "research";
  // Only classify as awareness if it matches awareness keywords — otherwise it's research (safer default)
  if (FUNNEL_KEYWORDS.awareness.some(kw => q.includes(kw))) return "awareness";
  // Generic queries that don't match any stage → research (not awareness)
  // "best espresso machine" is research, not awareness
  if (q.includes("best") || q.includes("top") || q.includes("recommended")) return "research";
  return "awareness";
}

function strictKeywordMatch(text: string, keywords: string[]): boolean {
  // Require either 2+ keyword matches (4+ char words) OR one match with a 6+ char word
  const longMatches = keywords.filter(w => w.length >= 6 && text.includes(w));
  if (longMatches.length >= 1) return true;
  const shortMatches = keywords.filter(w => w.length >= 4 && text.includes(w));
  return shortMatches.length >= 2;
}

/**
 * Post-process insights to replace LLM-fabricated numbers with
 * real counts derived from actual persona/evidence/content data.
 */
export function validateAndEnrichInsights(
  insights: RetailerInsights,
  personas: ShopperPersona[],
  allQueries: string[],
  allEvidence: SourceQuote[],
  mockPage: MockProductPage | null,
  actualListingContent: string | null,
  productName?: string,
  brand?: string
): RetailerInsights {
  const allQueriesLower = allQueries.map(q => q.toLowerCase());
  const allEvidenceLower = allEvidence.map(e => e.text.toLowerCase());

  const listingText = actualListingContent
    ? actualListingContent.toLowerCase()
    : mockPage
      ? [mockPage.title, mockPage.subtitle, ...mockPage.bullets, mockPage.description, mockPage.enhancedContent].join(" ").toLowerCase()
      : "";

  // =================================================================
  // FIX 1: Search Journey Funnel — compute from real queries
  // =================================================================
  const stageMap: Record<string, { queries: string[]; count: number }> = {
    awareness: { queries: [], count: 0 },
    research: { queries: [], count: 0 },
    comparison: { queries: [], count: 0 },
    purchase_intent: { queries: [], count: 0 },
  };

  for (const q of allQueriesLower) {
    const stage = classifyQueryToStage(q);
    stageMap[stage].queries.push(q);
    stageMap[stage].count++;
  }

  if (insights.searchJourney) {
    insights.searchJourney.stages = insights.searchJourney.stages.map(stage => {
      const real = stageMap[stage.stage];
      if (!real) return stage;

      // Pick diverse real examples — spread across the query list
      const step = Math.max(1, Math.floor(real.queries.length / 6));
      const examples = real.queries
        .filter((_, idx) => idx % step === 0)
        .slice(0, 6)
        .map(q => q.length > 60 ? q.slice(0, 57) + "..." : q);

      return {
        ...stage,
        queryCount: real.count,
        exampleQueries: examples,
        stageQueries: real.queries, // ALL queries for this stage — used by verify button
        // Keep LLM's dropoffInsight — that's analysis, not data
      };
    });
  }

  // =================================================================
  // FIX 2: Seasonal Signals — ground in real query data
  // =================================================================
  if (insights.seasonalSignals) {
    const totalQueries = allQueriesLower.length || 1;

    // Compute real seasonal breakdown from queries
    const realSignals: Record<string, { count: number; queries: string[] }> = {};
    for (const [key, config] of Object.entries(SEASONAL_KEYWORDS)) {
      const matching = allQueriesLower.filter(q =>
        config.keywords.some(kw => q.includes(kw))
      );
      if (matching.length > 0) {
        realSignals[key] = { count: matching.length, queries: matching };
      }
    }

    // Update each seasonal signal with real data
    insights.seasonalSignals = insights.seasonalSignals.map(sig => {
      const sigLower = sig.signal.toLowerCase() + " " + sig.timing.toLowerCase();

      // Find the best matching real signal
      let bestKey: string | null = null;
      let bestCount = 0;
      for (const [key, config] of Object.entries(SEASONAL_KEYWORDS)) {
        if (config.keywords.some(kw => sigLower.includes(kw))) {
          const real = realSignals[key];
          if (real && real.count > bestCount) {
            bestKey = key;
            bestCount = real.count;
          }
        }
      }

      if (bestKey && realSignals[bestKey]) {
        const pct = ((realSignals[bestKey].count / totalQueries) * 100).toFixed(1);
        return {
          ...sig,
          queryShare: `${pct}% of queries (${realSignals[bestKey].count} matches)`,
        };
      }

      // No real query match — check evidence instead
      const sigWords = sig.signal.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const evidenceCount = allEvidenceLower.filter(e =>
        sigWords.some(w => e.includes(w))
      ).length;

      return {
        ...sig,
        queryShare: evidenceCount > 0
          ? `${evidenceCount} related mentions in evidence`
          : "AI-estimated — no direct query data",
      };
    });
  }

  // =================================================================
  // FIX 5: Pain point + objection — stricter matching
  // =================================================================
  if (insights.painPointFixes) {
    insights.painPointFixes = insights.painPointFixes.map(fix => {
      const fixWords = fix.painPoint.toLowerCase().split(/\s+/).filter(w => w.length > 4);

      // Match: any evidence quote containing at least one keyword (same logic as UI's findMatchingEvidence)
      const realCount = allEvidenceLower.filter(e =>
        fixWords.some(w => e.includes(w))
      ).length;

      let currentCoverage = fix.currentCoverage;
      if (listingText) {
        const inPage = strictKeywordMatch(listingText, fixWords);
        currentCoverage = inPage ? "covered" : "missing";
      }

      return {
        ...fix,
        mentionCount: realCount,
        evidenceBacked: realCount >= 1,
        currentCoverage,
      };
    });
  }

  // Build product feature set for rebuttal verification
  const productFeatures = new Set<string>();
  if (productName) {
    // Extract key feature words from product research (passed via allQueries context)
    const featurePatterns = allQueriesLower.slice(0, 50).join(" ");
    featurePatterns.split(/\s+/).filter(w => w.length > 4).forEach(w => productFeatures.add(w));
  }

  if (insights.objectionMap) {
    insights.objectionMap = insights.objectionMap.map(obj => {
      const objWords = obj.objection.toLowerCase().split(/\s+/).filter(w => w.length > 3);

      const realCount = allEvidenceLower.filter(e =>
        strictKeywordMatch(e, objWords)
      ).length;

      // Verify rebuttal: check if key claims in the rebuttal match product features/evidence
      const rebuttalWords = obj.rebuttal.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const rebuttalInEvidence = allEvidenceLower.some(e =>
        rebuttalWords.filter(w => e.includes(w)).length >= 2
      );

      return {
        ...obj,
        frequency: realCount > 0
          ? `mentioned in ${realCount} related discussion${realCount !== 1 ? "s" : ""}`
          : "inferred from persona analysis",
        rebuttalVerified: rebuttalInEvidence,
      };
    });
  }

  // === Keyword gaps: verify against real queries ===
  if (insights.keywordGaps) {
    insights.keywordGaps = insights.keywordGaps.map(kw => {
      const kwLower = kw.keyword.toLowerCase();
      const kwWords = kwLower.split(/\s+/).filter(w => w.length > 3);

      const queryMatches = allQueriesLower.filter(q =>
        kwWords.some(word => q.includes(word))
      ).length;

      let currentPresence = kw.currentPresence;
      if (listingText) {
        const fullMatch = listingText.includes(kwLower);
        const partialMatch = kwWords.filter(w => listingText.includes(w)).length > kwWords.length * 0.5;
        currentPresence = fullMatch ? "partial" : partialMatch ? "weak" : "missing";
      }

      const evidenceMatches = allEvidenceLower.filter(e =>
        kwWords.some(word => e.includes(word))
      ).length;

      let priority = kw.priority;
      if (queryMatches === 0 && evidenceMatches === 0) {
        priority = "medium";
      }

      return { ...kw, currentPresence, priority, queryMatches };
    });

    insights.keywordGaps.sort((a, b) => {
      const aMatches = allQueriesLower.filter(q =>
        a.keyword.toLowerCase().split(/\s+/).filter(w => w.length > 3).some(word => q.includes(word))
      ).length;
      const bMatches = allQueriesLower.filter(q =>
        b.keyword.toLowerCase().split(/\s+/).filter(w => w.length > 3).some(word => q.includes(word))
      ).length;
      return bMatches - aMatches;
    });
  }

  // === Price perception signal frequencies ===
  if (insights.pricePerception?.priceSignals) {
    insights.pricePerception.priceSignals = insights.pricePerception.priceSignals.map(sig => {
      const sigWords = sig.signal.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const realCount = allEvidenceLower.filter(e =>
        strictKeywordMatch(e, sigWords)
      ).length;
      return {
        ...sig,
        frequency: realCount > 0
          ? `${realCount} mention${realCount !== 1 ? "s" : ""} in evidence`
          : "inferred from query patterns",
      };
    });
  }

  // =================================================================
  // FIX 3: Price perception — verify competitor prices from listings
  // =================================================================
  if (insights.pricePerception?.vsCompetitorPricing) {
    insights.pricePerception.vsCompetitorPricing = insights.pricePerception.vsCompetitorPricing.map(cp => {
      // Check if the claimed price appears in any evidence or listing text
      const priceMatch = cp.theirPrice.match(/\$[\d,.]+/);
      const priceInEvidence = priceMatch && allEvidenceLower.some(e => e.includes(priceMatch[0].toLowerCase()));
      const priceInListing = priceMatch && listingText.includes(priceMatch[0].toLowerCase());
      return {
        ...cp,
        priceVerified: !!(priceInEvidence || priceInListing),
      };
    });
  }

  // =================================================================
  // FIX 4: Review strategy — verify complaint themes against evidence
  // =================================================================
  if (insights.reviewStrategy?.negativeReviewResponses) {
    insights.reviewStrategy.negativeReviewResponses = insights.reviewStrategy.negativeReviewResponses.map(resp => {
      const themeWords = resp.complaintTheme.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const realCount = allEvidenceLower.filter(e => strictKeywordMatch(e, themeWords)).length;
      return {
        ...resp,
        evidenceBacked: realCount >= 1,
        frequency: realCount > 0
          ? `found in ${realCount} shopper discussion${realCount !== 1 ? "s" : ""}`
          : "inferred from product analysis",
      };
    });
  }

  // =================================================================
  // FIX 6: Messaging angle proof points — replace fake percentages with real counts
  // =================================================================
  if (insights.messagingAngles) {
    insights.messagingAngles = insights.messagingAngles.map(angle => {
      const proofPointEvidence = angle.proofPoints.map(pp => {
        const ppWords = pp.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        return allEvidenceLower.filter(e => ppWords.some(w => e.includes(w))).length;
      });
      // Strip fabricated percentages from proof points
      const cleanedProofPoints = angle.proofPoints.map((pp, idx) => {
        // Replace "87% of users" style claims with real evidence count
        const cleaned = pp.replace(/\d+%\s+of\s+\w+/gi, (match) => {
          const count = proofPointEvidence[idx];
          return count > 0 ? `(${count} mentions in evidence)` : "(AI-estimated)";
        });
        return cleaned;
      });
      return { ...angle, proofPoints: cleanedProofPoints, proofPointEvidence };
    });
  }

  // === Filter marketing-copy evidence (dynamic, not hardcoded) ===
  const marketingVerbs = ["features", "delivers", "designed to", "makes rich", "offers", "provides", "ensures", "combines", "brings you", "engineered"];
  // Build product/brand keywords for detection
  const productWords = (productName ?? "").split(/\s+/).filter(w => w.length > 3).map(w => w.toLowerCase());
  const brandLower = (brand ?? "").toLowerCase();

  for (const persona of personas) {
    persona.sourceEvidence = persona.sourceEvidence.filter(e => {
      if (e.text.length < 25) return false;

      const textLower = e.text.toLowerCase();
      // Detect marketing copy: starts with product/brand name + uses marketing verbs
      const startsWithBrandOrProduct = (
        (brandLower && textLower.startsWith(brandLower)) ||
        (brandLower && textLower.startsWith("the " + brandLower)) ||
        productWords.some(pw => textLower.startsWith(pw) || textLower.startsWith("the " + pw))
      );
      const hasMarketingVerbs = marketingVerbs.some(verb => textLower.includes(verb));
      // Also check for telltale marketing patterns
      const hasMarketingPatterns = /^(this|the|our|introducing|discover|experience|meet the)\s/i.test(e.text) && hasMarketingVerbs;

      if ((startsWithBrandOrProduct && hasMarketingVerbs) || hasMarketingPatterns) return false;

      return true;
    });
  }

  return insights;
}
