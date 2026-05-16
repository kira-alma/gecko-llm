import {
  updateAnalysis,
  updateRetailerResult,
  createRetailerResult,
  getAnalysis,
} from "../db";
import { getRetailerBySlug, DEFAULT_RETAILERS } from "../retailers";
import { runProductResearch } from "./stage-research";
import { runPersonaGeneration } from "./stage-personas";
import { runInsightGeneration } from "./stage-insights";
import { runContentGeneration } from "./stage-content";
import { validateAndEnrichInsights } from "./insight-validation";
import { calculateReadinessScore } from "../readiness-score";
import type { PipelineEvent } from "../types";

type ProgressCallback = (event: PipelineEvent) => void;

function emitEvent(
  onProgress: ProgressCallback,
  type: PipelineEvent["type"],
  stage: string,
  message: string,
  progress: number,
  retailer?: string,
  discovery?: string
) {
  onProgress({
    type,
    stage,
    message,
    progress,
    retailer,
    discovery,
    timestamp: new Date().toISOString(),
  });
}

// Run promises with limited concurrency
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function runNext(): Promise<void> {
    const i = index++;
    if (i >= tasks.length) return;
    results[i] = await tasks[i]();
    return runNext();
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () =>
    runNext()
  );
  await Promise.all(workers);
  return results;
}

// Phase 1: Research only — called right after analysis creation
export async function runResearchOnly(
  analysisId: string,
  onProgress: ProgressCallback
): Promise<void> {
  try {
    const analysis = getAnalysis(analysisId);
    if (!analysis) throw new Error(`Analysis ${analysisId} not found`);

    updateAnalysis(analysisId, {
      status: "researching",
      currentStage: "Researching product...",
      currentStageProgress: 0,
    });

    emitEvent(onProgress, "stage_start", "research", "Starting product research...", 5);

    const productResearch = await runProductResearch(
      analysis.productName,
      (message, stageProgress) => {
        updateAnalysis(analysisId, {
          currentStage: message,
          currentStageProgress: stageProgress,
        });
        emitEvent(onProgress, "stage_progress", "research", message, 5 + stageProgress * 90);
      }
    );

    const competitorNames = productResearch.competitors.map((c) => c.name);
    updateAnalysis(analysisId, {
      status: "pending",
      productResearch,
      competitors: competitorNames,
      currentStage: "Research complete — awaiting retailer selection",
      currentStageProgress: 1,
    });

    emitEvent(
      onProgress,
      "complete",
      "research",
      `Found ${productResearch.competitors.length} competitors across ${productResearch.categories.length} categories`,
      100,
      undefined,
      `Identified ${productResearch.categories.map((c) => c.name).join(", ")}`
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    updateAnalysis(analysisId, {
      status: "failed",
      currentStage: "Research failed",
      errorMessage: errorMsg,
    });
    emitEvent(onProgress, "error", "research", errorMsg, -1);
  }
}

// Phase 2: Full retailer analysis — called after retailer selection
export async function runRetailerAnalysis(
  analysisId: string,
  onProgress: ProgressCallback
): Promise<void> {
  try {
    const analysis = getAnalysis(analysisId);
    if (!analysis) throw new Error(`Analysis ${analysisId} not found`);
    if (!analysis.productResearch) throw new Error("Product research not completed");

    const productResearch = analysis.productResearch;
    const selectedRetailers = analysis.selectedRetailers;
    const selectedCategories = analysis.selectedCategories ?? [];

    updateAnalysis(analysisId, {
      status: "generating_personas",
      currentStage: "Generating personas...",
      currentStageProgress: 0,
    });

    // Create retailer result rows
    for (const slug of selectedRetailers) {
      const retailer =
        getRetailerBySlug(slug) ||
        DEFAULT_RETAILERS.find((r) => r.name.toLowerCase() === slug.toLowerCase());
      const name = retailer?.name ?? slug;
      createRetailerResult(analysisId, slug, name);
    }

    const totalRetailers = selectedRetailers.length;
    let completedRetailers = 0;

    const retailerTasks = selectedRetailers.map((slug) => {
      return async () => {
        const retailer = getRetailerBySlug(slug);
        const name = retailer?.name ?? slug;
        const domain = retailer?.domain ?? `${slug}.com`;

        try {
          // --- Stage 2: Personas ---
          updateRetailerResult(analysisId, slug, { status: "generating_personas" });
          emitEvent(
            onProgress,
            "stage_start",
            "personas",
            `Generating personas for ${name}...`,
            20 + (completedRetailers / totalRetailers) * 60,
            name
          );

          const personaOutput = await runPersonaGeneration(
            productResearch,
            name,
            domain,
            selectedCategories,
            (message, stageProgress) => {
              const overallProgress =
                20 +
                ((completedRetailers + stageProgress * 0.5) / totalRetailers) * 60;
              updateAnalysis(analysisId, {
                currentStage: message,
                currentStageProgress: stageProgress,
              });
              emitEvent(
                onProgress,
                "stage_progress",
                "personas",
                message,
                overallProgress,
                name
              );
            }
          );

          updateRetailerResult(analysisId, slug, {
            status: "generating_insights",
            personas: personaOutput.personas,
            searchQueries: personaOutput.searchQueries,
            clusteringData: personaOutput.clusteringData,
            sources: personaOutput.sources,
            researchStats: personaOutput.researchStats,
          });

          emitEvent(
            onProgress,
            "discovery",
            "personas",
            `Found ${personaOutput.personas.personas.length} personas for ${name}`,
            20 + ((completedRetailers + 0.5) / totalRetailers) * 60,
            name,
            `${name}: ${personaOutput.personas.personas.map((p) => p.archetypeName).join(", ")}`
          );

          // --- Stage 3: Insights ---
          updateAnalysis(analysisId, {
            status: "generating_insights",
            currentStage: `Generating insights for ${name}...`,
          });
          emitEvent(
            onProgress,
            "stage_start",
            "insights",
            `Analyzing competitive positioning for ${name}...`,
            20 + ((completedRetailers + 0.5) / totalRetailers) * 60,
            name
          );

          const retailerDefForInsights = DEFAULT_RETAILERS.find(r => r.name.toLowerCase() === name.toLowerCase());
          const insights = await runInsightGeneration(
            productResearch,
            personaOutput.personas,
            name,
            personaOutput.competitorListings,
            retailerDefForInsights?.searchBehavior ?? "",
            personaOutput.actualListingContent,
            (message, stageProgress) => {
              emitEvent(
                onProgress,
                "stage_progress",
                "insights",
                message,
                20 + ((completedRetailers + 0.5 + stageProgress * 0.2) / totalRetailers) * 60,
                name
              );
            }
          );

          // --- Validation: cross-reference insights against real data ---
          const allPersonaQueries = personaOutput.personas.personas.flatMap(p => p.searchQueries);
          const allEvidence = personaOutput.personas.personas.flatMap(p => p.sourceEvidence);
          const validatedInsights = validateAndEnrichInsights(
            insights,
            personaOutput.personas.personas,
            allPersonaQueries,
            allEvidence,
            null, // mock page not generated yet
            personaOutput.actualListingContent,
            productResearch.productName,
            productResearch.brand
          );
          validatedInsights.contentReadiness = calculateReadinessScore(validatedInsights, personaOutput.actualListingContent ?? undefined);

          updateRetailerResult(analysisId, slug, {
            status: "completed",
            competitivePositioning: validatedInsights,
          });

          completedRetailers++;
          emitEvent(
            onProgress,
            "stage_complete",
            "content",
            `${name} analysis complete`,
            20 + (completedRetailers / totalRetailers) * 60,
            name,
            `${name}: ${personaOutput.personas.personas.length} personas, ${allPersonaQueries.length} queries`
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          const errorStack = err instanceof Error ? err.stack : "";
          console.error(`[GeckoLLM] ${name} pipeline failed:`, errorMsg);
          console.error(`[GeckoLLM] Stack:`, errorStack);
          updateRetailerResult(analysisId, slug, {
            status: "failed",
            errorMessage: errorMsg,
          });
          emitEvent(
            onProgress,
            "error",
            "pipeline",
            `${name} failed: ${errorMsg}`,
            20 + (completedRetailers / totalRetailers) * 60,
            name
          );
        }
      };
    });

    // Run retailers with max 3 concurrent
    await runWithConcurrency(retailerTasks, 3);

    // ========================================
    // Complete
    // ========================================
    updateAnalysis(analysisId, {
      status: "completed",
      currentStage: "Analysis complete",
      currentStageProgress: 1,
    });

    emitEvent(
      onProgress,
      "complete",
      "pipeline",
      `Analysis complete — ${completedRetailers}/${totalRetailers} retailers analyzed`,
      100
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    updateAnalysis(analysisId, {
      status: "failed",
      currentStage: "Pipeline failed",
      errorMessage: errorMsg,
    });
    emitEvent(onProgress, "error", "pipeline", errorMsg, -1);
  }
}
