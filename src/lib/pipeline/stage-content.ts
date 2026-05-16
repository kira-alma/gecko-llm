import { callClaudeJSON } from "../anthropic";
import { getRetailerContentConventions, getRetailerBySlug } from "../retailers";
import {
  buildMockPageSystemPrompt,
  buildMockPagePrompt,
  CAMPAIGN_SYSTEM_PROMPT,
  buildCampaignPrompt,
} from "../prompts/content";
import type {
  ProductResearch,
  RetailerPersonas,
  RetailerInsights,
  MockProductPage,
  CampaignBrief,
  SocialAdCopy,
} from "../types";

export interface ContentStageOutput {
  mockProductPage: MockProductPage;
  campaignBriefs: CampaignBrief[];
  socialAdCopy: SocialAdCopy[];
}

export interface ContentOverrides {
  painPoints?: string[];
  keywords?: string[];
  objections?: { objection: string; rebuttal: string }[];
  usps?: string[];
  compGapFixes?: string[];
  vulnerabilities?: string[];
}

export async function runContentGeneration(
  productResearch: ProductResearch,
  personas: RetailerPersonas,
  insights: RetailerInsights,
  retailerName: string,
  retailerSlug: string,
  actualRating: { stars: number; count: string } | null,
  onProgress: (message: string, progress: number) => void,
  actualListingContent?: string | null,
  overrides?: ContentOverrides
): Promise<ContentStageOutput> {
  const pageLayout = getRetailerContentConventions(retailerSlug);
  const retailerDef = getRetailerBySlug(retailerSlug);

  // Prepare condensed context
  const productSummary = JSON.stringify(
    {
      productName: productResearch.productName,
      brand: productResearch.brand,
      keyFeatures: productResearch.keyFeatures,
      pricing: productResearch.pricing,
      competitors: productResearch.competitors.slice(0, 3).map((c) => ({
        name: c.name,
        priceRange: c.priceRange,
        keyDifferentiator: c.keyDifferentiator,
      })),
    },
    null,
    2
  );

  const personasSummary = JSON.stringify(
    personas.personas.map((p) => ({
      id: p.id,
      archetypeName: p.archetypeName,
      tagline: p.tagline,
      searchQueries: p.searchQueries.slice(0, 5),
      contentPreferences: p.contentPreferences,
      painPoints: p.psychographics.painPoints,
      values: p.psychographics.values,
    })),
    null,
    2
  );

  const insightsSummary = JSON.stringify(
    {
      positioning: insights.competitivePositioning.summary,
      messagingAngles: insights.messagingAngles.map((a) => ({
        angle: a.angle,
        targetPersonas: a.targetPersonas,
        emotionalHook: a.emotionalHook,
      })),
      contentGaps: insights.contentGaps.map((g) => ({
        gap: g.gap,
        recommendation: g.recommendation,
      })),
      topRecommendations: insights.recommendations.slice(0, 3),
    },
    null,
    2
  );

  // Build explicit gap lists — use overrides if provided, otherwise derive from insights
  const missingPainPoints = overrides?.painPoints ?? (insights.painPointFixes ?? [])
    .filter(f => f.currentCoverage === "missing" || f.currentCoverage === "partial")
    .map(f => f.painPoint);
  const missingKeywords = overrides?.keywords ?? (insights.keywordGaps ?? [])
    .filter(k => k.currentPresence === "missing" || k.currentPresence === "weak")
    .map(k => k.keyword);
  const highObjections = overrides?.objections ?? (insights.objectionMap ?? [])
    .filter(o => o.severity === "high" || o.severity === "medium")
    .map(o => ({ objection: o.objection, rebuttal: o.rebuttal }));

  // Competitor differentiation
  const usps = overrides?.usps ?? insights.competitivePositioning.uniqueSellingPoints;
  const compGapFixes = overrides?.compGapFixes ?? (insights.competitorContentGaps ?? []).map(g => g.fixAction);
  const vulnerabilities = overrides?.vulnerabilities ?? insights.competitivePositioning.vulnerabilities;

  // Per-persona keywords (to reach all shopper types)
  const personaKeywords = personas.personas.map(p => ({
    name: p.archetypeName,
    terms: [...p.psychographics.painPoints.slice(0, 2), ...p.searchQueries.slice(0, 3)],
  }));

  // Messaging angles (tone and emotional hooks)
  const messagingAngles = (insights.messagingAngles ?? []).map(a => ({
    angle: a.angle,
    hook: a.emotionalHook,
    proofPoints: a.proofPoints.slice(0, 2),
    channels: a.channelFit,
  }));

  // Review themes (what shoppers want to see addressed)
  const reviewThemes = (insights.reviewStrategy?.reviewThemes ?? []).map(t => t.theme);

  // Seasonal signals (timely content angles)
  const seasonalSignals = (insights.seasonalSignals ?? []).map(s => ({
    signal: s.signal,
    timing: s.timing,
    recommendation: s.recommendation,
  }));

  const gapInstructions = `

=== MANDATORY CONTENT REQUIREMENTS ===
Your generated content MUST explicitly address every item below. After generation, we will verify each one by checking if the keywords appear in your output. Your content score depends on covering ALL these gaps.

PAIN POINTS TO ADDRESS (${missingPainPoints.length} items — each must be addressed in bullets, description, or A+ content):
${missingPainPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

KEYWORDS TO INCLUDE (${missingKeywords.length} items — each keyword or close variant must appear in title, bullets, description, or A+ content):
${missingKeywords.map((k, i) => `${i + 1}. "${k}"`).join("\n")}

OBJECTIONS TO COUNTER (${highObjections.length} items — address each with the suggested rebuttal in bullets, FAQ, or A+ content):
${highObjections.map((o, i) => `${i + 1}. Objection: "${o.objection}" → Counter with: "${o.rebuttal}"`).join("\n")}

UNIQUE STRENGTHS TO HIGHLIGHT (${usps.length} items — each must be explicitly mentioned in the content):
${usps.map((u, i) => `${i + 1}. ${u}`).join("\n")}

COMPETITOR GAPS TO ADDRESS (${compGapFixes.length} items — include content that closes these gaps):
${compGapFixes.map((f, i) => `${i + 1}. ${f}`).join("\n")}

VULNERABILITIES TO COUNTER (${vulnerabilities.length} items — add messaging that mitigates each):
${vulnerabilities.map((v, i) => `${i + 1}. ${v}`).join("\n")}

SHOPPER TYPES TO REACH (${personaKeywords.length} personas — content must contain terms relevant to each):
${personaKeywords.map((p, i) => `${i + 1}. ${p.name}: ${p.terms.join(", ")}`).join("\n")}

MESSAGING ANGLES TO INCORPORATE (${messagingAngles.length} angles — weave these emotional hooks and proof points into the content):
${messagingAngles.map((a, i) => `${i + 1}. "${a.angle}" — Hook: "${a.hook}" | Proof: ${a.proofPoints.join("; ")} | Best for: ${a.channels.join(", ")}`).join("\n")}

REVIEW THEMES TO ADDRESS (${reviewThemes.length} themes — content should preemptively address what shoppers look for in reviews):
${reviewThemes.map((t, i) => `${i + 1}. ${t}`).join("\n")}

SEASONAL/TRENDING CONTENT (${seasonalSignals.length} signals — incorporate timely angles where relevant):
${seasonalSignals.map((s, i) => `${i + 1}. ${s.signal} (${s.timing}) — ${s.recommendation}`).join("\n")}

Do NOT ignore these lists. Every item must be verifiably present in your output.`;

  // Run mock page and campaign generation in parallel
  onProgress(`Generating mock product page for ${retailerName}...`, 0);

  const [mockPage, campaignData] = await Promise.all([
    callClaudeJSON<MockProductPage>({
      systemPrompt: buildMockPageSystemPrompt(retailerName, pageLayout, retailerDef?.voiceNotes),
      userPrompt: buildMockPagePrompt(
        productResearch.productName,
        productResearch.brand,
        retailerName,
        retailerSlug,
        productSummary,
        personasSummary,
        insightsSummary + gapInstructions,
        actualListingContent
      ),
      maxTokens: 8192,
      cacheSystemPrompt: true,
    }),
    callClaudeJSON<{
      campaignBriefs: CampaignBrief[];
      socialAdCopy: SocialAdCopy[];
    }>({
      systemPrompt: CAMPAIGN_SYSTEM_PROMPT,
      userPrompt: buildCampaignPrompt(
        productResearch.productName,
        productResearch.brand,
        retailerName,
        personasSummary,
        insightsSummary + gapInstructions,
        insights.searchJourney
          ? JSON.stringify(insights.searchJourney.stages.map(s => ({
              stage: s.label,
              queries: s.queryCount,
              insight: s.dropoffInsight,
            })))
          : undefined
      ),
      maxTokens: 16384,
      cacheSystemPrompt: true,
    }),
  ]);

  // Override mock page rating with real data if available
  if (actualRating) {
    mockPage.rating = actualRating;
  }

  onProgress(`Content complete for ${retailerName}`, 1);

  return {
    mockProductPage: mockPage,
    campaignBriefs: campaignData.campaignBriefs,
    socialAdCopy: campaignData.socialAdCopy,
  };
}
