import { NextRequest, NextResponse } from "next/server";
import { getAnalysis, updateAnalysis } from "@/lib/db";
import { runResearchOnly, runRetailerAnalysis } from "@/lib/pipeline/orchestrator";
import type { PipelineEvent } from "@/lib/types";

// Store active pipeline events in memory for SSE consumers
const pipelineEvents = new Map<string, PipelineEvent[]>();

export function getPipelineEvents(analysisId: string): PipelineEvent[] {
  return pipelineEvents.get(analysisId) ?? [];
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { analysisId, mode, selectedRetailers, competitors } = body;

  if (!analysisId) {
    return NextResponse.json(
      { error: "analysisId is required" },
      { status: 400 }
    );
  }

  const analysis = getAnalysis(analysisId);
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // Update with any new selections
  if (selectedRetailers) {
    updateAnalysis(analysisId, { selectedRetailers });
  }
  if (competitors) {
    updateAnalysis(analysisId, { competitors });
  }

  // Initialize event store
  pipelineEvents.set(analysisId, []);

  const onEvent = (event: PipelineEvent) => {
    const events = pipelineEvents.get(analysisId) ?? [];
    events.push(event);
    pipelineEvents.set(analysisId, events);

    if (event.type === "complete" || event.type === "error") {
      setTimeout(() => {
        pipelineEvents.delete(analysisId);
      }, 10 * 60 * 1000);
    }
  };

  // Choose which pipeline to run
  if (mode === "research") {
    // Phase 1: Research only
    runResearchOnly(analysisId, onEvent).catch((err) => {
      console.error("Research pipeline error:", err);
    });
  } else {
    // Phase 2: Full retailer analysis (requires research to be done)
    runRetailerAnalysis(analysisId, onEvent).catch((err) => {
      console.error("Retailer analysis error:", err);
    });
  }

  return NextResponse.json({ status: "started", analysisId });
}
