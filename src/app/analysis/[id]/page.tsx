"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ResearchReview } from "@/components/research-review";
import { RetailerSelector } from "@/components/retailer-selector";
import { PipelineProgress } from "@/components/pipeline-progress";
import { RetailerAnalysisTabs } from "@/components/retailer-tabs";
import { CrossRetailerMatrix } from "@/components/cross-retailer-matrix";
import { PromptsViewer } from "@/components/prompts-viewer";
import type { Analysis, RetailerResult, PipelineEvent } from "@/lib/types";

type Phase =
  | "loading"
  | "researching"
  | "research-review"
  | "retailer-select"
  | "processing"
  | "results";

export default function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [retailerResults, setRetailerResults] = useState<RetailerResult[]>([]);
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [resultsView, setResultsView] = useState<"analysis" | "advanced">("analysis");

  // Pipeline state for both research and full analysis
  const [pipelineEvents, setPipelineEvents] = useState<PipelineEvent[]>([]);
  const [pipelineProgress, setPipelineProgress] = useState(0);
  const [pipelineMessage, setPipelineMessage] = useState("");
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const researchStartedRef = useRef(false);

  const fetchAnalysis = useCallback(async () => {
    const res = await fetch(`/api/analyses/${id}`);
    if (!res.ok) {
      router.push("/");
      return;
    }
    const data = await res.json();
    setAnalysis(data);
    setRetailerResults(data.retailerResults ?? []);
    setCompetitors(data.competitors ?? []);
    setSelectedCategories(data.selectedCategories ?? []);
    return data as Analysis & { retailerResults: RetailerResult[] };
  }, [id, router]);

  // Connect to SSE for pipeline progress with auto-reconnect and polling fallback
  const connectSSE = useCallback(
    (onComplete?: () => void) => {
      setPipelineEvents([]);
      setPipelineProgress(0);
      setPipelineError(null);
      setPipelineComplete(false);
      setPipelineMessage("Starting...");

      let closed = false;
      let es: EventSource | null = null;

      const openSSE = () => {
        if (closed) return;
        es = new EventSource(`/api/pipeline/status?analysisId=${id}`);

        es.onmessage = (e) => {
          try {
            const event: PipelineEvent = JSON.parse(e.data);
            setPipelineEvents((prev) => [...prev, event]);
            setPipelineProgress(Math.max(0, Math.min(100, event.progress)));
            setPipelineMessage(event.message);

            if (event.type === "complete") {
              closed = true;
              setPipelineComplete(true);
              es?.close();
              onComplete?.();
            }
            if (event.type === "error" && event.progress === -1) {
              closed = true;
              setPipelineError(event.message);
              es?.close();
            }
          } catch {
            // ignore
          }
        };

        es.onerror = () => {
          es?.close();
          // Auto-reconnect after 3 seconds if not done
          if (!closed) {
            setTimeout(openSSE, 3000);
          }
        };
      };

      openSSE();

      // Polling fallback — check status every 10 seconds in case SSE dies
      const pollInterval = setInterval(async () => {
        if (closed) { clearInterval(pollInterval); return; }
        try {
          const res = await fetch(`/api/analyses/${id}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.status === "completed") {
            closed = true;
            clearInterval(pollInterval);
            es?.close();
            setPipelineComplete(true);
            setPipelineProgress(100);
            setPipelineMessage("Analysis complete");
            onComplete?.();
          } else if (data.status === "failed") {
            closed = true;
            clearInterval(pollInterval);
            es?.close();
            setPipelineError(data.errorMessage ?? "Pipeline failed");
          }
        } catch { /* ignore poll errors */ }
      }, 10000);

      // Return cleanup
      return { close: () => { closed = true; es?.close(); clearInterval(pollInterval); } };
    },
    [id]
  );

  // Initial load — determine phase
  useEffect(() => {
    fetchAnalysis().then((data) => {
      if (!data) return;

      if (data.status === "completed") {
        setPhase("results");
      } else if (
        data.status === "generating_personas" ||
        data.status === "generating_insights" ||
        data.status === "generating_content"
      ) {
        setPhase("processing");
        connectSSE(() => fetchAnalysis());
      } else if (data.status === "researching") {
        setPhase("researching");
        connectSSE(() => {
          fetchAnalysis().then((refreshed) => {
            // Auto-select primary categories
            if (refreshed?.productResearch?.categories) {
              const primary = refreshed.productResearch.categories
                .filter(c => c.relevance === "primary")
                .map(c => c.name);
              setSelectedCategories(primary);
            }
            setPhase("research-review");
          });
        });
      } else if (data.productResearch) {
        // Returning to research review — auto-select if empty
        if (data.selectedCategories.length === 0 && data.productResearch.categories) {
          const primary = data.productResearch.categories
            .filter((c: { relevance: string }) => c.relevance === "primary")
            .map((c: { name: string }) => c.name);
          setSelectedCategories(primary);
        }
        setPhase("research-review");
      } else {
        // Brand new — start research
        if (!researchStartedRef.current) {
          researchStartedRef.current = true;
          startResearch();
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startResearch = async () => {
    setPhase("researching");
    setPipelineMessage("Starting product research...");

    await fetch("/api/pipeline/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId: id, mode: "research" }),
    });

    connectSSE(() => {
      fetchAnalysis().then(() => setPhase("research-review"));
    });
  };

  const handleResearchConfirm = async () => {
    await fetch(`/api/analyses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitors, selectedCategories }),
    });
    setPhase("retailer-select");
  };

  const handleLaunchAnalysis = async (selectedRetailers: string[]) => {
    await fetch(`/api/analyses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedRetailers }),
    });

    setPhase("processing");
    if (analysis) {
      setAnalysis({ ...analysis, selectedRetailers });
    }

    await fetch("/api/pipeline/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysisId: id,
        mode: "analyze",
        selectedRetailers,
        competitors,
      }),
    });

    connectSSE(() => fetchAnalysis());
  };

  const discoveries = pipelineEvents.filter((e) => e.type === "discovery");

  if (phase === "loading" || !analysis) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-8">
      {/* Top bar */}
      <div className="mb-6 max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="text-muted-foreground"
          >
            &larr; Back
          </Button>
          <span className="ml-3 text-sm text-muted-foreground">
            {analysis.productName}
          </span>
        </div>
        {phase === "results" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                const data = { analysis, retailerResults };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `geckollm-${analysis.productName.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => window.print()}
            >
              Download PDF
            </Button>
          </div>
        )}
      </div>

      {/* Researching Phase */}
      {phase === "researching" && (
        <div className="max-w-2xl mx-auto space-y-6 text-center">
          <h2 className="text-2xl font-bold">Researching Product</h2>
          <p className="text-muted-foreground">
            Searching the web for product details, competitors, and categories...
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{pipelineMessage}</span>
              <span className="font-mono">{Math.round(pipelineProgress)}%</span>
            </div>
            <Progress value={pipelineProgress} className="h-2" />
          </div>
        </div>
      )}

      {/* Research Review Phase */}
      {phase === "research-review" && analysis.productResearch && (
        <ResearchReview
          research={analysis.productResearch}
          competitors={competitors}
          selectedCategories={selectedCategories}
          onCompetitorsChange={setCompetitors}
          onCategoriesChange={setSelectedCategories}
          onConfirm={handleResearchConfirm}
        />
      )}

      {/* Retailer Selection Phase */}
      {phase === "retailer-select" && (
        <RetailerSelector onLaunch={handleLaunchAnalysis} />
      )}

      {/* Processing Phase */}
      {phase === "processing" && (
        <PipelineProgress
          events={pipelineEvents}
          discoveries={discoveries}
          progress={pipelineProgress}
          currentMessage={pipelineMessage}
          isComplete={pipelineComplete}
          error={pipelineError}
          retailers={analysis.selectedRetailers}
          onViewResults={() => {
            fetchAnalysis();
            setPhase("results");
          }}
        />
      )}

      {/* Results Phase */}
      {phase === "results" && (
        <div className="max-w-6xl mx-auto">
          {/* Top-level view tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-border/30 pb-3">
            <button
              onClick={() => setResultsView("analysis")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                resultsView === "analysis"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-muted-foreground hover:bg-muted/20"
              }`}
            >
              Analysis
            </button>
            <button
              onClick={() => setResultsView("advanced")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                resultsView === "advanced"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "text-muted-foreground hover:bg-muted/20"
              }`}
            >
              {"\u2699"} Advanced Settings
            </button>
          </div>

          {resultsView === "analysis" && (
            <>
              <CrossRetailerMatrix
                retailerResults={retailerResults}
                onNavigate={(retailerSlug, section) => {
                  const sectionToTab: Record<string, string> = {
                    readiness: "understand",
                    funnel: "understand",
                    price: "understand",
                    positioning: "compete",
                    "competitor-gaps": "compete",
                    keywords: "compete",
                    painpoints: "act",
                    objections: "act",
                  };

                  // 1. Switch retailer tab
                  const tabTrigger = document.querySelector(`[data-retailer-tab="${retailerSlug}"]`) as HTMLElement;
                  if (tabTrigger) tabTrigger.click();

                  // 2. Wait, then open playbook + switch tab + scroll — with retry
                  const attempt = (retries: number) => {
                    setTimeout(() => {
                      // Open playbook if closed
                      const playbookTrigger = document.querySelector(`[data-playbook-trigger="${retailerSlug}"]`) as HTMLElement;
                      if (playbookTrigger) {
                        const isOpen = playbookTrigger.getAttribute("data-state") === "open"
                          || playbookTrigger.closest("[data-state=open]") !== null;
                        if (!isOpen) playbookTrigger.click();
                      }

                      // Switch insight tab
                      const targetTab = sectionToTab[section];
                      if (targetTab) {
                        const insightTab = document.querySelector(`[data-insight-tab="${retailerSlug}-${targetTab}"]`) as HTMLElement;
                        if (insightTab) insightTab.click();
                      }

                      // Scroll to section
                      setTimeout(() => {
                        const el = document.getElementById(`${retailerSlug}-${section}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "start" });
                        } else if (retries > 0) {
                          // Section not found yet — retry (content may still be rendering)
                          attempt(retries - 1);
                        }
                      }, 300);
                    }, 300);
                  };

                  attempt(2);
                }}
              />
              <RetailerAnalysisTabs retailerResults={retailerResults} selectedCategories={analysis.selectedCategories} analysisId={id} onRefresh={() => fetchAnalysis()} />
            </>
          )}

          {resultsView === "advanced" && (
            <PromptsViewer />
          )}
        </div>
      )}
    </main>
  );
}
