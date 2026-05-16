import { NextRequest, NextResponse } from "next/server";
import { getAnalysis, getRetailerResult, updateRetailerResult } from "@/lib/db";
import { runContentGeneration } from "@/lib/pipeline/stage-content";
import { validateAndEnrichInsights } from "@/lib/pipeline/insight-validation";
import { calculateReadinessScore } from "@/lib/readiness-score";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { analysisId, retailerSlug, overrides } = body;

  if (!analysisId || !retailerSlug) {
    return NextResponse.json({ error: "analysisId and retailerSlug required" }, { status: 400 });
  }

  const analysis = getAnalysis(analysisId);
  if (!analysis?.productResearch) {
    return NextResponse.json({ error: "Analysis or research not found" }, { status: 404 });
  }

  const retailerResult = getRetailerResult(analysisId, retailerSlug);
  if (!retailerResult?.personas || !retailerResult?.competitivePositioning) {
    return NextResponse.json({ error: "Personas and insights must be generated first" }, { status: 400 });
  }

  try {
    // Save the BEFORE score (current content readiness against real listing)
    const beforeScore = retailerResult.competitivePositioning.contentReadiness;

    const content = await runContentGeneration(
      analysis.productResearch,
      retailerResult.personas,
      retailerResult.competitivePositioning,
      retailerResult.retailerName,
      retailerSlug,
      null,
      (message) => {
        console.log(`[GeckoLLM] Content generation: ${message}`);
      },
      null,
      overrides
    );

    // Calculate AFTER score — validate against the generated mock page content
    const allPersonaQueries = retailerResult.personas.personas.flatMap(p => p.searchQueries);
    const allEvidence = retailerResult.personas.personas.flatMap(p => p.sourceEvidence);

    // Build mock page text for validation
    const mockPageText = [
      content.mockProductPage.title,
      content.mockProductPage.subtitle,
      ...content.mockProductPage.bullets,
      content.mockProductPage.description,
      content.mockProductPage.enhancedContent,
    ].join(" ");

    const revalidated = validateAndEnrichInsights(
      retailerResult.competitivePositioning,
      retailerResult.personas.personas,
      allPersonaQueries,
      allEvidence,
      content.mockProductPage,
      mockPageText, // Use mock page as the "listing" to check against
      analysis.productResearch.productName,
      analysis.productResearch.brand
    );

    // Keep the BEFORE score, calculate AFTER score against mock page content
    revalidated.contentReadiness = beforeScore;
    revalidated.contentReadinessAfter = calculateReadinessScore(revalidated, mockPageText);

    updateRetailerResult(analysisId, retailerSlug, {
      competitivePositioning: revalidated,
      mockProductPage: content.mockProductPage,
      campaignBriefs: content.campaignBriefs,
      socialAdCopy: content.socialAdCopy,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error(`[GeckoLLM] Content generation failed for ${retailerSlug}:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
