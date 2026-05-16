"use client";

import { useState, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PersonaClusterChart } from "./persona-cluster-chart";
import { PersonaCard } from "./persona-card";
import { InsightPanel } from "./insight-panel";
import { MockProductPageView } from "./mock-product-page";
import { CampaignBriefView, SocialAdCopyView } from "./campaign-brief";
import { SourcePanel } from "./source-panel";
import { VerifyButton } from "./verify-evidence";
import type { RetailerResult } from "@/lib/types";

const RETAILER_COLORS: Record<string, string> = {
  amazon: "#FF9900",
  walmart: "#0071DC",
  target: "#CC0000",
  costco: "#E31837",
  bestbuy: "#0046BE",
};

export function RetailerAnalysisTabs({
  retailerResults,
  selectedCategories,
  analysisId,
  onRefresh,
}: {
  retailerResults: RetailerResult[];
  selectedCategories?: string[];
  analysisId?: string;
  onRefresh?: () => void;
}) {
  const completed = retailerResults.filter((r) => r.status === "completed");

  if (completed.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        No completed retailer analyses yet.
      </div>
    );
  }

  return (
    <Tabs defaultValue={completed[0].retailerSlug} className="w-full">
      <TabsList className="w-full justify-start bg-muted/30 p-1 rounded-xl overflow-x-auto">
        {completed.map((r) => (
          <TabsTrigger
            key={r.retailerSlug}
            value={r.retailerSlug}
            data-retailer-tab={r.retailerSlug}
            className="gap-2 rounded-lg px-5 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-md transition-all"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: RETAILER_COLORS[r.retailerSlug] ?? "#6b7280",
              }}
            />
            <span className="font-medium">{r.retailerName}</span>
            {r.personas && (
              <span className="text-[10px] text-muted-foreground ml-1">
                {r.personas.personas.length} personas
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {completed.map((result) => (
        <TabsContent key={result.retailerSlug} value={result.retailerSlug} className="mt-6">
          <RetailerAnalysisView result={result} categories={selectedCategories} analysisId={analysisId} onRefresh={onRefresh} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-sm">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function StatCard({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="gecko-glass rounded-lg p-4 text-center gecko-stat transition-transform">
      <p className={`text-2xl font-bold gecko-count-up ${color ?? "text-emerald-400"}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

export interface EditableInsights {
  painPoints: { id: string; text: string; fix: string; placement: string }[];
  keywords: { id: string; keyword: string }[];
  objections: { id: string; objection: string; rebuttal: string }[];
  usps: string[];
  compGapFixes: { id: string; competitor: string; fix: string }[];
  vulnerabilities: string[];
}

function initEditableInsights(result: RetailerResult): EditableInsights {
  const ins = result.competitivePositioning;
  return {
    painPoints: (ins?.painPointFixes ?? []).map((p, i) => ({ id: `pp-${i}`, text: p.painPoint, fix: p.contentFix, placement: p.placement })),
    keywords: (ins?.keywordGaps ?? []).map((k, i) => ({ id: `kw-${i}`, keyword: k.keyword })),
    objections: (ins?.objectionMap ?? []).map((o, i) => ({ id: `obj-${i}`, objection: o.objection, rebuttal: o.rebuttal })),
    usps: ins?.competitivePositioning.uniqueSellingPoints ?? [],
    compGapFixes: (ins?.competitorContentGaps ?? []).map((g, i) => ({ id: `cg-${i}`, competitor: g.competitorName, fix: g.fixAction })),
    vulnerabilities: ins?.competitivePositioning.vulnerabilities ?? [],
  };
}

function RetailerAnalysisView({ result, categories, analysisId, onRefresh }: { result: RetailerResult; categories?: string[]; analysisId?: string; onRefresh?: () => void }) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const personaRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [editableInsights, setEditableInsights] = useState<EditableInsights>(() => initEditableInsights(result));

  const allPersonas = result.personas?.personas ?? [];
  const filteredPersonas = activeCategory
    ? allPersonas.filter(p => p.relevantCategories?.some(c => c.toLowerCase().includes(activeCategory.toLowerCase())))
    : allPersonas;
  // If filter removes all, show all (don't let UI go blank)
  const displayPersonas = filteredPersonas.length > 0 ? filteredPersonas : allPersonas;
  const personaCount = displayPersonas.length;
  const campaignCount = result.campaignBriefs?.length ?? 0;
  const adCount = result.socialAdCopy?.length ?? 0;

  return (
    <div className="space-y-10">
      {/* Persona hero strip */}
      <div className="gecko-glass rounded-xl overflow-hidden" style={{ borderLeft: `3px solid ${RETAILER_COLORS[result.retailerSlug] ?? "#6b7280"}` }}>
        {/* Header row */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: RETAILER_COLORS[result.retailerSlug] ?? "#6b7280" }}>
              {result.retailerName} Shoppers
            </span>
            <span className="text-[10px] text-muted-foreground">{"\u00B7"} {personaCount} personas identified</span>
          </div>
          <SourcePanel
            sources={result.sources}
            methodology={result.personas?.methodology}
            researchStats={result.researchStats}
          />
        </div>

        {/* Persona pills */}
        {result.personas && (
          <div className="px-5 pb-4 flex flex-wrap gap-2">
            {displayPersonas.map((p, i) => {
              const colors = ["bg-emerald-500/15 text-emerald-400 border-emerald-500/25", "bg-blue-500/15 text-blue-400 border-blue-500/25", "bg-amber-500/15 text-amber-400 border-amber-500/25", "bg-violet-500/15 text-violet-400 border-violet-500/25", "bg-rose-500/15 text-rose-400 border-rose-500/25", "bg-cyan-500/15 text-cyan-400 border-cyan-500/25"];
              return (
                <span key={p.id} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${colors[i % colors.length]}`}>
                  {p.archetypeName}
                  <span className="text-[9px] opacity-60">~{Math.round(p.clusterCoordinates.estimatedSegmentSize * 100)}%</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Category filter — inline */}
        {categories && categories.length > 1 && (
          <div className="px-5 pb-3 flex items-center gap-2 flex-wrap border-t border-border/20 pt-3">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">Category:</span>
            <button onClick={() => setActiveCategory(null)} className={`text-[10px] px-2 py-0.5 rounded font-medium transition-all ${!activeCategory ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground hover:text-foreground"}`}>All</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)} className={`text-[10px] px-2 py-0.5 rounded font-medium transition-all ${activeCategory === cat ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground hover:text-foreground"}`}>{cat}</button>
            ))}
          </div>
        )}

        {/* Expand to see full personas */}
        <Collapsible>
          <CollapsibleTrigger className="w-full text-left border-t border-border/20 px-5 py-2.5 flex items-center justify-between hover:bg-muted/5 transition-colors group">
            <span className="text-[10px] text-muted-foreground font-medium group-data-[state=open]:text-emerald-400">
              <span className="group-data-[state=open]:hidden">View detailed persona profiles & clustering</span>
              <span className="hidden group-data-[state=open]:inline">Collapse persona profiles</span>
            </span>
            <span className="text-muted-foreground/40 text-xs group-data-[state=open]:rotate-90 transition-transform">{"\u25B6"}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 gecko-glass rounded-xl p-3 sticky top-4 self-start">
                <PersonaClusterChart
                  personas={displayPersonas}
                  selectedPersonaId={selectedPersonaId}
                  onPersonaClick={(id) => {
                    setSelectedPersonaId(id);
                    const el = personaRefs.current.get(id);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                />
              </div>
              <div className="lg:col-span-3 space-y-3 gecko-stagger">
                {displayPersonas.map((p, i) => (
                  <div
                    key={p.id}
                    ref={(el) => { if (el) personaRefs.current.set(p.id, el); }}
                    className={`transition-all duration-300 rounded-xl ${selectedPersonaId === p.id ? "ring-2 ring-emerald-500/50 scale-[1.01]" : ""}`}
                    onClick={() => setSelectedPersonaId(selectedPersonaId === p.id ? null : p.id)}
                  >
                    <PersonaCard persona={p} index={i} searchQueries={result.searchQueries ?? undefined} />
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Insights — the main analysis (Understand / Compete / Act tabs) */}
      {result.competitivePositioning && (
        <section>
          <InsightPanel insights={result.competitivePositioning} retailerSlug={result.retailerSlug} personas={result.personas?.personas} searchQueries={result.searchQueries ?? undefined} allEvidence={result.sources} editableInsights={editableInsights} onEditInsights={setEditableInsights} />
        </section>
      )}

      {/* Content Studio */}
      {(() => {
        const cr = result.competitivePositioning?.contentReadiness;
        const currentScore = cr?.overallScore ?? 0;
        // Calculate projected score: current + all "fail" items that content generation would fix
        const failItems = cr?.categories.reduce((sum, cat) => sum + (cat.items?.filter(i => i.status === "fail").length ?? 0), 0) ?? 0;
        const totalItems = cr?.categories.reduce((sum, cat) => sum + (cat.items?.length ?? 0), 0) ?? 1;
        const projectedScore = Math.min(100, Math.round(currentScore + (failItems / totalItems) * 60));
        const hasContent = result.mockProductPage || result.campaignBriefs;
        const afterScore = result.competitivePositioning?.contentReadinessAfter;
        const actualAfterScore = afterScore?.overallScore ?? null;
        const retailerColor = RETAILER_COLORS[result.retailerSlug] ?? "#6b7280";

        return (
      <Collapsible>
        <CollapsibleTrigger className="w-full text-left">
          <div className="gecko-glass rounded-xl p-5 hover:bg-muted/5 transition-colors" style={{ borderLeft: `3px solid ${retailerColor}` }}>
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  {"\u270E"} Content Studio
                </h3>
                <span className="text-muted-foreground/40 text-sm">{"\u25B6"}</span>
              </div>

              {cr && (
                <div className="space-y-3">
                  {/* Score + categories inline */}
                  <div className="flex items-start gap-4">
                    {/* Big score number */}
                    <div className="shrink-0 text-center">
                      <span className={`text-3xl font-bold ${currentScore >= 70 ? "text-emerald-400" : currentScore >= 40 ? "text-amber-400" : "text-red-400"}`}>
                        {currentScore}
                      </span>
                      <p className="text-[8px] text-muted-foreground uppercase tracking-wider">/100</p>
                    </div>
                    {/* Categories inline with dot separators */}
                    <div className="flex-1 pt-1">
                      <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                        {cr.categories.map((cat: { category: string; score: number; maxScore: number }, ci: number) => {
                          const ratio = cat.score / cat.maxScore;
                          const color = ratio >= 0.7 ? "text-emerald-400" : ratio >= 0.4 ? "text-amber-400" : "text-red-400";
                          return (
                            <span key={ci} className="text-[10px] text-muted-foreground">
                              {ci > 0 && <span className="mx-1 text-muted-foreground/30">{"\u00B7"}</span>}
                              {cat.category}: <span className={`font-mono font-bold ${color}`}>{cat.score}/{cat.maxScore}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Score progress visualization */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      {hasContent ? (
                        <>
                          <span className="text-[10px] text-muted-foreground"><span className="font-bold">Before:</span> {currentScore}</span>
                          <span className="text-[10px] text-emerald-400">{"\u2713"} <span className="font-bold">After:</span> {actualAfterScore ?? projectedScore}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] text-muted-foreground"><span className="font-bold">Content Score Now:</span> {currentScore}</span>
                          <span className="text-[10px] text-emerald-400">{"\u26A1"} <span className="font-bold">Generate to reach {projectedScore}+</span></span>
                        </>
                      )}
                    </div>
                    {/* Thermometer bar */}
                    <div className="relative h-3 rounded-full bg-muted/15 overflow-visible">
                      {/* Background gradient track */}
                      <div className="absolute inset-0 rounded-full opacity-20" style={{ background: "linear-gradient(90deg, #ef4444, #f59e0b 40%, #10b981 80%)" }} />
                      {/* Current score fill */}
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                        style={{
                          width: `${currentScore}%`,
                          background: `linear-gradient(90deg, #ef4444, #f59e0b 50%, #10b981 100%)`,
                          backgroundSize: "200% 100%",
                          backgroundPosition: `${100 - currentScore}% 0`,
                        }}
                      />
                      {/* Projected zone — dashed outline */}
                      {!hasContent && (
                        <div
                          className="absolute inset-y-0 rounded-r-full border-2 border-dashed border-emerald-500/40"
                          style={{ left: `${currentScore}%`, width: `${projectedScore - currentScore}%` }}
                        />
                      )}
                      {/* After score fill (when content generated) */}
                      {hasContent && actualAfterScore && (
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                          style={{
                            width: `${actualAfterScore}%`,
                            background: `linear-gradient(90deg, #ef4444, #f59e0b 40%, #10b981 80%)`,
                            backgroundSize: "150% 100%",
                            backgroundPosition: `${100 - actualAfterScore}% 0`,
                          }}
                        />
                      )}
                      {/* Current marker */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-white/60" style={{ left: `${currentScore}%` }} />
                      {/* Projected/After marker */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-emerald-400/60" style={{ left: `${hasContent ? (actualAfterScore ?? projectedScore) : projectedScore}%` }} />
                    </div>
                    {/* Scale labels */}
                    <div className="flex items-center justify-between text-[8px] text-muted-foreground/30">
                      <span>0</span>
                      <span>25</span>
                      <span>50</span>
                      <span>75</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 pl-3 space-y-6" style={{ borderLeft: `3px solid ${retailerColor}` }}>

            {/* Content Readiness detail breakdown */}
            <ContentReadinessSummary result={result} allEvidence={result.sources} searchQueries={result.searchQueries ?? []} />

            {/* How is the score calculated */}
            <Collapsible>
              <CollapsibleTrigger className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1">
                <span>{"\u25B6"}</span>
                How is the score calculated?
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 gecko-glass rounded-lg p-4 text-xs text-muted-foreground space-y-2">
                  <p>The Content Score measures how well your product content covers what shoppers need. Each category checks if specific keywords appear in the content:</p>
                  <p><span className="font-semibold text-foreground">Pain Point Coverage (25pts):</span> Does your content address each shopper pain point identified from Reddit, reviews, and forums?</p>
                  <p><span className="font-semibold text-foreground">Keyword Coverage (25pts):</span> Do the search terms shoppers actually type appear in your product title, bullets, or description?</p>
                  <p><span className="font-semibold text-foreground">Handling Shopper Concerns (20pts):</span> Does your content address each objection with a rebuttal? (e.g., "too expensive" → "cost-per-cup savings")</p>
                  <p><span className="font-semibold text-foreground">Standing Out vs Competitors (15pts):</span> Does your content mention your unique strengths and address competitor advantages?</p>
                  <p><span className="font-semibold text-foreground">Reaching All Shopper Types (15pts):</span> Does your content contain keywords relevant to each identified persona?</p>
                  <p className="pt-1 border-t border-border/20"><span className="font-semibold text-foreground">Before vs After:</span> "Before" checks against your current live listing on the retailer. "After" checks against the generated mock page. The difference shows exactly what the generated content improves.</p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Content generation */}
            <ContentStudioSection result={result} analysisId={analysisId} onRefresh={onRefresh} editableInsights={editableInsights} />

          </div>
        </CollapsibleContent>
      </Collapsible>
        );
      })()}
    </div>
  );
}

function ContentStudioSection({ result, analysisId, onRefresh, editableInsights }: { result: RetailerResult; analysisId?: string; onRefresh?: () => void; editableInsights: EditableInsights }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasContent = result.mockProductPage || result.campaignBriefs;

  const handleGenerate = async () => {
    if (!analysisId) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          retailerSlug: result.retailerSlug,
          overrides: {
            painPoints: editableInsights.painPoints.map(p => p.text),
            keywords: editableInsights.keywords.map(k => k.keyword),
            objections: editableInsights.objections.map(o => ({ objection: o.objection, rebuttal: o.rebuttal })),
            usps: editableInsights.usps,
            compGapFixes: editableInsights.compGapFixes.map(g => `${g.competitor}: ${g.fix}`),
            vulnerabilities: editableInsights.vulnerabilities,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate content");
      }
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  const totalItems = editableInsights.painPoints.length + editableInsights.keywords.length + editableInsights.objections.length + editableInsights.usps.length + editableInsights.compGapFixes.length + editableInsights.vulnerabilities.length;

  if (!hasContent) {
    return (
      <div className="space-y-4">
        <p className="text-[10px] text-muted-foreground">
          Edit insights in the Retailer Playbook above, then generate content. Items you delete or edit will be reflected in the generated content.
        </p>
        <div className="text-center">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating content...
              </span>
            ) : (
              `Generate Content (${totalItems} items)`
            )}
          </button>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="product-page">
      <TabsList className="bg-muted/30 p-1 rounded-lg">
        <TabsTrigger value="product-page" className="rounded-md px-4">
          Product Page Mock
        </TabsTrigger>
        <TabsTrigger value="marketing" className="rounded-md px-4">
          Marketing Materials
        </TabsTrigger>
      </TabsList>

      <TabsContent value="product-page" className="mt-4">
        {result.mockProductPage && (
          <MockProductPageView
            page={result.mockProductPage}
            retailerSlug={result.retailerSlug}
          />
        )}
      </TabsContent>

      <TabsContent value="marketing" className="mt-4 space-y-10">
        {result.campaignBriefs && (
          <CampaignBriefView briefs={result.campaignBriefs} />
        )}
        {result.socialAdCopy && (
          <SocialAdCopyView ads={result.socialAdCopy} />
        )}
      </TabsContent>
    </Tabs>
  );
}

function ContentReadinessSummary({ result, allEvidence, searchQueries }: { result: RetailerResult; allEvidence: import("@/lib/types").SourceQuote[]; searchQueries: import("@/lib/types").SearchQuery[] }) {
  const cr = result.competitivePositioning?.contentReadiness;
  const crAfter = result.competitivePositioning?.contentReadinessAfter;
  if (!cr || !cr.categories?.[0]?.items) return null;

  const STATUS_C: Record<string, { text: string }> = {
    strong: { text: "text-emerald-400" },
    adequate: { text: "text-amber-400" },
    weak: { text: "text-red-400" },
    missing: { text: "text-red-300" },
  };

  const findEvidence = (text: string) => {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    return allEvidence.filter(e => words.some(w => e.text.toLowerCase().includes(w))).map(e => ({ text: e.text, source: e.source, url: e.url }));
  };

  const findQueries = (text: string) => {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    return searchQueries.filter(q => words.some(w => q.query.toLowerCase().includes(w))).map(q => ({ text: q.query }));
  };

  const renderCategoryGrid = (categories: typeof cr.categories, label: string) => (
    <div className="space-y-1">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      {categories.map((cat, i) => {
        const ratio = cat.score / cat.maxScore;
        const barColor = ratio >= 0.7 ? "#10b981" : ratio >= 0.4 ? "#f59e0b" : "#ef4444";
        const ratioColor = ratio >= 0.7 ? "text-emerald-400" : ratio >= 0.4 ? "text-amber-400" : "text-red-400";
        return (
          <Collapsible key={i}>
            <CollapsibleTrigger className="w-full text-left">
              <div className="flex items-center gap-2 hover:bg-muted/5 rounded px-1 -mx-1 transition-colors">
                <span className="text-[10px] w-40 shrink-0">{cat.category}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted/20 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ratio * 100}%`, backgroundColor: barColor }} />
                    </div>
                    <span className={`text-[9px] font-mono font-bold w-10 text-right shrink-0 ${ratioColor}`}>{cat.score}/{cat.maxScore}</span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pl-1 space-y-0.5 mt-0.5">
                    {(cat.items ?? []).map((item, j) => {
                      const cleanLabel = item.label.replace(/^(Strength|Gap vs \w+|Vulnerability): /i, "");
                      const isKeyword = cat.category === "Keyword Coverage";
                      const evidence = isKeyword ? findQueries(cleanLabel) : findEvidence(cleanLabel);
                      return (
                        <div key={j} className="flex items-center gap-1.5 text-[9px]">
                          <span className={item.status === "pass" ? "text-emerald-400" : "text-red-400"}>
                            {item.status === "pass" ? "\u2713" : "\u2717"}
                          </span>
                          <span className={`flex-1 ${item.status === "pass" ? "text-muted-foreground/60" : "text-muted-foreground"}`}>{item.label}</span>
                          {evidence.length > 0 && <VerifyButton items={evidence} type={isKeyword ? "queries" : "quotes"} label="show evidence" />}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
  );

  return (
    <div className="px-5 pb-4 pt-3 space-y-4">
      {crAfter ? (
        <>
          <div className="grid grid-cols-2 gap-6">
            <div>{renderCategoryGrid(cr.categories, `Current Content (${cr.overallScore}/100)`)}</div>
            <div>{renderCategoryGrid(crAfter.categories, `Generated Content (${crAfter.overallScore}/100)`)}</div>
          </div>
        </>
      ) : (
        renderCategoryGrid(cr.categories, `Content Breakdown (${cr.overallScore}/100)`)
      )}
    </div>
  );
}
