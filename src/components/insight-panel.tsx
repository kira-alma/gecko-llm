"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VerifyButton } from "./verify-evidence";
import { EditableItem, AddItemInput } from "./editable-insight-item";
import type { RetailerInsights, ShopperPersona, SourceQuote, SearchQuery } from "@/lib/types";

function ContentInputBadge() {
  return (
    <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 cursor-help" title="Used in content generation — editable">
      {"\u270E"} Content input
    </span>
  );
}

function InfoBadge() {
  return (
    <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-slate-500/20 cursor-help" title="Informational only — not used in content generation">
      {"\uD83D\uDCCA"} Informational
    </span>
  );
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  strong: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  adequate: { bg: "bg-amber-500/20", text: "text-amber-400" },
  weak: { bg: "bg-red-500/20", text: "text-red-400" },
  missing: { bg: "bg-red-500/30", text: "text-red-300" },
};

const COVERAGE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  covered: { bg: "bg-emerald-500", text: "text-emerald-400", label: "Covered" },
  partial: { bg: "bg-amber-500", text: "text-amber-400", label: "Partial" },
  missing: { bg: "bg-red-500", text: "text-red-400", label: "Missing" },
};

const SIGNAL_COLORS: Record<string, { bg: string; text: string }> = {
  seasonal: { bg: "bg-orange-500/15", text: "text-orange-400" },
  evergreen: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  trending: { bg: "bg-violet-500/15", text: "text-violet-400" },
};

function matchesPersona(personaIds: string[] | undefined, activePersona: string | null): boolean {
  if (!activePersona) return true;
  if (!personaIds || personaIds.length === 0) return true;
  return personaIds.some(id => id === activePersona);
}

export function InsightPanel({ insights, retailerSlug, personas, searchQueries, allEvidence, editableInsights, onEditInsights }: {
  insights: RetailerInsights;
  retailerSlug?: string;
  personas?: ShopperPersona[];
  searchQueries?: SearchQuery[];
  allEvidence?: SourceQuote[];
  editableInsights?: import("./retailer-tabs").EditableInsights;
  onEditInsights?: (updater: (prev: import("./retailer-tabs").EditableInsights) => import("./retailer-tabs").EditableInsights) => void;
}) {
  const pos = insights.competitivePositioning;
  const sid = (s: string) => retailerSlug ? `${retailerSlug}-${s}` : s;
  const [activePersona, setActivePersona] = useState<string | null>(null);

  const personaList = personas ?? [];
  const evidenceList = allEvidence ?? [];
  const queryList = searchQueries ?? [];

  const findMatchingEvidence = (text: string) => {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    return evidenceList.filter(e => words.some(w => e.text.toLowerCase().includes(w))).map(e => ({ text: e.text, source: e.source, url: e.url }));
  };

  const findMatchingQueries = (text: string) => {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    return queryList.filter(q => words.some(w => q.query.toLowerCase().includes(w))).map(q => ({ text: q.query }));
  };

  return (
    <div className="space-y-6">

      {/* ============================================ */}
      {/* RETAILER PLAYBOOK — one foldable card with everything inside */}
      {/* ============================================ */}
      <Collapsible>
        <CollapsibleTrigger className="w-full text-left" data-playbook-trigger={retailerSlug}>
          <div className="gecko-glass rounded-xl p-4 hover:bg-muted/5 transition-colors" style={{ borderLeft: `3px solid ${({"amazon":"#FF9900","walmart":"#0071DC","target":"#CC0000","costco":"#E31837","bestbuy":"#0046BE"} as Record<string,string>)[retailerSlug ?? ""] ?? "#8b5cf6"}` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{"\uD83D\uDCCB"}</span>
                <div>
                  <h3 className="font-semibold">{insights.retailerName ?? ""} Retailer Playbook</h3>
                  <p className="text-xs text-muted-foreground">Shopper intelligence, competitive landscape & action plan</p>
                </div>
              </div>
              <span className="text-muted-foreground/40 text-sm">{"\u25B6"}</span>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 pl-3 space-y-6" style={{ borderLeft: `3px solid ${({"amazon":"#FF9900","walmart":"#0071DC","target":"#CC0000","costco":"#E31837","bestbuy":"#0046BE"} as Record<string,string>)[retailerSlug ?? ""] ?? "#8b5cf6"}` }}>

      {/* Persona filter */}
      {personaList.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold shrink-0">View by persona:</span>
          <button onClick={() => setActivePersona(null)} className={`text-[11px] px-3 py-1 rounded-lg font-medium transition-all border ${!activePersona ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted/20 text-muted-foreground border-transparent hover:bg-muted/40"}`}>
            All Personas
          </button>
          {personaList.map(p => (
            <button key={p.id} onClick={() => setActivePersona(activePersona === p.id ? null : p.id)} className={`text-[11px] px-3 py-1 rounded-lg font-medium transition-all border ${activePersona === p.id ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted/20 text-muted-foreground border-transparent hover:bg-muted/40"}`}>
              {p.archetypeName}
            </button>
          ))}
        </div>
      )}

      <Tabs defaultValue="understand">
        <TabsList className="w-full bg-muted/20 p-1.5 rounded-xl border border-border/30">
          <TabsTrigger value="understand" data-insight-tab={`${retailerSlug}-understand`} className="flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-violet-500/15 data-[state=active]:text-violet-400 data-[state=active]:shadow-md transition-all">
            {"\uD83D\uDD0D"} Understand
          </TabsTrigger>
          <TabsTrigger value="compete" data-insight-tab={`${retailerSlug}-compete`} className="flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400 data-[state=active]:shadow-md transition-all">
            {"\u2694"} Compete
          </TabsTrigger>
          <TabsTrigger value="act" data-insight-tab={`${retailerSlug}-act`} className="flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-400 data-[state=active]:shadow-md transition-all">
            {"\u26A1"} Act
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* TAB 1: UNDERSTAND */}
        {/* ============================================ */}
        <TabsContent value="understand" className="mt-6 space-y-8">

          {/* Search Journey Funnel */}
          {insights.searchJourney && (() => {
            const funnelStages = insights.searchJourney!.stages.map(stage => {
              if (!activePersona || !searchQueries) return stage;
              const FUNNEL_KW: Record<string, string[]> = {
                awareness: ["what is", "types of", "how to", "guide"],
                research: ["review", "worth it", "pros cons", "recommend", "rating"],
                comparison: [" vs ", "versus", "compared", "alternative", "better than"],
                purchase_intent: ["price", "deal", "coupon", "buy", "sale", "cost"],
              };
              const personaQueries = searchQueries.filter(q => q.personaIds.includes(activePersona));
              const matching = personaQueries.filter(q => (FUNNEL_KW[stage.stage] ?? []).some(kw => q.query.toLowerCase().includes(kw)));
              return { ...stage, queryCount: matching.length, exampleQueries: matching.slice(0, 4).map(q => q.query) };
            });
            const maxCount = Math.max(...funnelStages.map(s => s.queryCount), 1);

            return (
            <div id={sid("funnel")}>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-violet-500/20 flex items-center justify-center text-violet-400 text-xs">{"\u2B95"}</span>
                Search Journey <InfoBadge />
              </h3>
              <div className="gecko-glass rounded-xl p-5 space-y-1">
                {funnelStages.map((stage, i, arr) => {
                  const pct = (stage.queryCount / maxCount) * 100;
                  const colors = ["bg-violet-500", "bg-blue-500", "bg-cyan-500", "bg-emerald-500"];
                  const textColors = ["text-violet-400", "text-blue-400", "text-cyan-400", "text-emerald-400"];
                  return (
                    <div key={stage.stage} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${textColors[i] ?? ""}`}>{stage.label}</span>
                        <span className="text-xs font-mono font-bold">{stage.queryCount} queries</span>
                      </div>
                      <div className="h-8 rounded-lg bg-muted/10 overflow-hidden flex items-center">
                        <div className={`h-full ${stage.queryCount > 0 ? (colors[i] ?? "") : ""} rounded-lg transition-all duration-700 flex items-center px-3`} style={{ width: stage.queryCount > 0 ? `${Math.max(pct, 15)}%` : "0%" }}>
                          <span className="text-[9px] text-white/80 truncate" title={stage.exampleQueries.slice(0, 4).map(q => `"${q}"`).join(", ")}>{stage.exampleQueries.slice(0, 2).map(q => `"${q}"`).join(", ")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] text-muted-foreground/60 italic pl-1 flex-1">{stage.dropoffInsight}</p>
                        {stage.stageQueries && stage.stageQueries.length > 0 && (
                          <VerifyButton items={stage.stageQueries.map(q => ({ text: q }))} type="queries" label="show evidence" />
                        )}
                      </div>
                      {i < arr.length - 1 && <div className="flex justify-center py-0.5"><span className="text-muted-foreground/20 text-xs">{"\u25BC"}</span></div>}
                    </div>
                  );
                })}
              </div>
            </div>
            ); })()}

          {/* Price Perception */}
          {insights.pricePerception && !activePersona && (
            <div id={sid("price")}>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">$</span>
                Price Perception <InfoBadge />
              </h3>
              <div className="gecko-glass rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                    insights.pricePerception.overallPerception === "good_value" || insights.pricePerception.overallPerception === "premium_justified"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                      : insights.pricePerception.overallPerception === "fair"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                        : "bg-red-500/15 text-red-400 border-red-500/20"
                  }`}>{insights.pricePerception.overallPerception.replace("_", " ")}</span>
                </div>
                <p className="text-sm leading-relaxed">{insights.pricePerception.perceptionSummary}</p>
                {insights.pricePerception.priceSignals.length > 0 && (
                  <div className="space-y-1">
                    {insights.pricePerception.priceSignals.map((sig, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${sig.sentiment === "positive" ? "bg-emerald-400" : sig.sentiment === "negative" ? "bg-red-400" : "bg-slate-400"}`} />
                        <span className="text-muted-foreground flex-1">{sig.signal}</span>
                        <span className="text-[9px] text-muted-foreground/50">{sig.frequency}</span>
                        <VerifyButton items={findMatchingEvidence(sig.signal)} type="quotes" label="show evidence" />
                      </div>
                    ))}
                  </div>
                )}
                {insights.pricePerception.perPersona.filter(pp => !activePersona || pp.personaId === activePersona).length > 0 && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {insights.pricePerception.perPersona.filter(pp => !activePersona || pp.personaId === activePersona).map((pp, i) => (
                      <div key={i} className="gecko-glass rounded-lg p-3 space-y-1">
                        <span className="text-[9px] font-mono text-muted-foreground">{pp.personaId}</span>
                        <p className="text-xs">{pp.perception}</p>
                        <p className="text-[10px] text-emerald-400/80">{"\u2192"} {pp.reframingStrategy}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Seasonal Signals */}
          {insights.seasonalSignals && insights.seasonalSignals.length > 0 && (
            <div>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-xs">{"\u2600"}</span>
                Seasonal & Trend Signals <ContentInputBadge />
              </h3>
              <div className="space-y-2">
                {insights.seasonalSignals.map((sig, i) => {
                  const style = SIGNAL_COLORS[sig.type] ?? SIGNAL_COLORS.evergreen;
                  return (
                    <div key={i} className={`rounded-lg p-4 border border-border/30 ${style.bg} group`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] uppercase tracking-wider font-bold ${style.text}`}>{sig.type}</span>
                          <span className="text-[9px] text-muted-foreground">{sig.timing}</span>
                          <span className="text-[9px] font-mono text-muted-foreground/60">~{sig.queryShare}</span>
                        </div>
                        <button
                          onClick={() => {
                            if (!insights.seasonalSignals) return;
                            insights.seasonalSignals.splice(i, 1);
                            onEditInsights?.(prev => ({ ...prev }));
                          }}
                          className="text-white/30 hover:text-red-400 transition-colors text-sm px-1 rounded hover:bg-red-500/10"
                        >{"\u2717"}</button>
                      </div>
                      <p className="text-sm font-medium">{sig.signal}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{sig.recommendation}</p>
                      <VerifyButton items={findMatchingQueries(sig.signal)} type="queries" label="show evidence" />
                    </div>
                  );
                })}
                <AddItemInput placeholder="Add seasonal signal (e.g., 'Holiday gift-giving surge')..." onAdd={(text) => {
                  insights.seasonalSignals?.push({ signal: text, type: "seasonal", timing: "", queryShare: "AI estimated", recommendation: "" });
                  onEditInsights?.(prev => ({ ...prev }));
                }} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* TAB 2: COMPETE */}
        {/* ============================================ */}
        <TabsContent value="compete" className="mt-6 space-y-8">

          {/* Positioning Strategy */}
          <div id={sid("positioning")}>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs">{"\u2605"}</span>
              Positioning Strategy <ContentInputBadge />
            </h3>
            <div className="gecko-glass rounded-xl p-5 space-y-3">
              <p className="text-sm leading-relaxed">{pos.summary}</p>
              <div className="flex flex-wrap gap-2">
                {(editableInsights?.usps ?? pos.uniqueSellingPoints).map((usp, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{usp}
                    {editableInsights && (
                      <button
                        onClick={() => onEditInsights?.(prev => ({ ...prev, usps: prev.usps.filter((_, j) => j !== i) }))}
                        className="text-white/30 hover:text-red-400 transition-colors text-[10px] ml-1"
                      >{"\u2717"}</button>
                    )}
                  </span>
                ))}
                {editableInsights && <AddItemInput placeholder="Add strength..." onAdd={(text) => onEditInsights?.(prev => ({ ...prev, usps: [...prev.usps, text] }))} />}
              </div>
            </div>
          </div>

          {/* Battlecards */}
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">Competitor Battlecards <InfoBadge /></h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pos.vsCompetitors.filter(comp => matchesPersona(comp.mostRelevantPersonas, activePersona)).map((comp, i) => (
                <div key={i} className="rounded-xl border border-border/50 bg-card/50 p-4 space-y-3 hover:border-border hover:bg-card transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">vs {comp.competitorName}</span>
                      <span className={`text-[7px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${comp.verified ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                        {comp.verified ? "verified" : "estimated"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{comp.positioningStatement}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 text-xs mt-px shrink-0">{"\u25C6"}</span>
                      <div><span className="text-[9px] uppercase tracking-wider text-amber-400/80 font-semibold">Battleground</span><p className="text-xs text-muted-foreground">{comp.keyBattleground}</p></div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-emerald-400 text-xs mt-px shrink-0">{"\u2713"}</span>
                      <div><span className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-semibold">Win Strategy</span><p className="text-xs text-muted-foreground">{comp.winStrategy}</p></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor Content Gaps (editable) */}
          {editableInsights && editableInsights.compGapFixes.length > 0 && (
            <div id={sid("competitor-gaps")}>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">Competitor Content Gaps <ContentInputBadge /></h3>
              <div className="grid gap-3 md:grid-cols-2">
                {editableInsights.compGapFixes.map((gap) => {
                  const originalGap = insights.competitorContentGaps?.find(g => g.competitorName === gap.competitor);
                  return (
                    <div key={gap.id} className="gecko-glass rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">vs {gap.competitor}</p>
                          {originalGap && (
                            <span className={`text-[7px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${originalGap.verified ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                              {originalGap.verified ? "verified listing" : "estimated"}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => onEditInsights?.(prev => ({ ...prev, compGapFixes: prev.compGapFixes.filter(g => g.id !== gap.id) }))}
                          className="text-white/40 hover:text-red-400 transition-colors text-sm px-1 rounded hover:bg-red-500/10"
                        >{"\u2717"}</button>
                      </div>
                      {originalGap && (
                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2"><span className="text-red-400 shrink-0 mt-px">{"\u2717"}</span><div><span className="text-[9px] uppercase tracking-wider text-red-400/70 font-semibold">They do well</span><p className="text-muted-foreground">{originalGap.theirStrength}</p></div></div>
                          <div className="flex items-start gap-2"><span className="text-amber-400 shrink-0 mt-px">{"\u25C6"}</span><div><span className="text-[9px] uppercase tracking-wider text-amber-400/70 font-semibold">Our gap</span><p className="text-muted-foreground">{originalGap.ourGap}</p></div></div>
                        </div>
                      )}
                      <div className="flex items-start gap-2 text-xs">
                        <span className="text-emerald-400 shrink-0 mt-px">{"\u2713"}</span>
                        <div className="flex-1">
                          <span className="text-[9px] uppercase tracking-wider text-emerald-400/70 font-semibold">Fix</span>
                          <EditableItem
                            text={gap.fix}
                            onUpdate={(t) => onEditInsights?.(prev => ({ ...prev, compGapFixes: prev.compGapFixes.map(g => g.id === gap.id ? { ...g, fix: t } : g) }))}
                            onDelete={() => onEditInsights?.(prev => ({ ...prev, compGapFixes: prev.compGapFixes.filter(g => g.id !== gap.id) }))}
                            color="text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keyword Gaps */}
          {insights.keywordGaps && insights.keywordGaps.length > 0 && (
            <div id={sid("keywords")}>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">Keyword Gap Analysis <ContentInputBadge /></h3>
              <div className="gecko-glass rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/30">
                  <div className="col-span-4">Keyword</div>
                  <div className="col-span-1 text-center">Vol</div>
                  <div className="col-span-1 text-center">Priority</div>
                  <div className="col-span-2 text-center">Status</div>
                  <div className="col-span-2">Evidence</div>
                  <div className="col-span-2"></div>
                </div>
                {insights.keywordGaps.filter(kw => matchesPersona(kw.personaIds, activePersona)).sort((a, b) => {
                  const pri = { critical: 0, high: 1, medium: 2 };
                  return (pri[a.priority] ?? 3) - (pri[b.priority] ?? 3);
                }).map((kw, i) => {
                  const volDot = { high: "bg-emerald-400", medium: "bg-amber-400", low: "bg-slate-400" };
                  const priColors = { critical: "text-red-400 bg-red-500/15", high: "text-amber-400 bg-amber-500/15", medium: "text-slate-400 bg-slate-500/15" };
                  const presColors = { missing: "text-red-400", weak: "text-amber-400", partial: "text-slate-400" };
                  return (
                    <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-muted/5 transition-colors border-b border-border/10">
                      <div className="col-span-4"><code className="text-[11px]">{kw.keyword}</code></div>
                      <div className="col-span-1 flex justify-center"><span className={`w-2 h-2 rounded-full ${volDot[kw.searchVolume] ?? ""}`} /></div>
                      <div className="col-span-1 flex justify-center"><span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${priColors[kw.priority] ?? ""}`}>{kw.priority}</span></div>
                      <div className="col-span-2 text-center"><span className={`text-[10px] font-medium ${presColors[kw.currentPresence] ?? ""}`}>{kw.currentPresence}</span></div>
                      <div className="col-span-2">
                        {(kw.queryMatches ?? 0) > 0
                          ? <VerifyButton items={findMatchingQueries(kw.keyword)} type="queries" label="show evidence" />
                          : <span className="text-[9px] text-amber-400/70">AI estimated</span>
                        }
                      </div>
                      <div className="col-span-2 flex justify-end">
                        {editableInsights && (
                          <button
                            onClick={() => onEditInsights?.(prev => ({ ...prev, keywords: prev.keywords.filter(k => k.keyword !== kw.keyword) }))}
                            className="text-white/30 hover:text-red-400 transition-colors text-sm px-1 rounded hover:bg-red-500/10"
                          >{"\u2717"}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vulnerabilities (editable) */}
          {(editableInsights?.vulnerabilities ?? pos.vulnerabilities).length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-400 flex items-center gap-2"><span>{"\u26A0"}</span> Competitive Risks to Watch <ContentInputBadge /></p>
              <div className="space-y-1.5">
                {(editableInsights?.vulnerabilities ?? pos.vulnerabilities).map((v, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-amber-500/50 shrink-0 mt-0.5">{"\u25CF"}</span>
                    {editableInsights ? (
                      <EditableItem
                        text={v}
                        onUpdate={(t) => onEditInsights?.(prev => ({ ...prev, vulnerabilities: prev.vulnerabilities.map((vv, j) => j === i ? t : vv) }))}
                        onDelete={() => onEditInsights?.(prev => ({ ...prev, vulnerabilities: prev.vulnerabilities.filter((_, j) => j !== i) }))}
                        color="text-xs text-amber-200/70"
                      />
                    ) : (
                      <p className="text-xs text-amber-200/70">{v}</p>
                    )}
                  </div>
                ))}
                {editableInsights && <AddItemInput placeholder="Add vulnerability..." onAdd={(text) => onEditInsights?.(prev => ({ ...prev, vulnerabilities: [...prev.vulnerabilities, text] }))} />}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ============================================ */}
        {/* TAB 3: ACT */}
        {/* ============================================ */}
        <TabsContent value="act" className="mt-6 space-y-8">

          {/* Pain Point → Content Fix (editable) */}
          {editableInsights && editableInsights.painPoints.length > 0 && (
            <div id={sid("painpoints")}>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center text-red-400 text-xs">{"\u26A1"}</span>
                Pain Point {"\u2192"} Content Fix <ContentInputBadge />
              </h3>
              <div className="space-y-2">
                {editableInsights.painPoints.map((pp) => (
                  <div key={pp.id} className="gecko-glass rounded-lg p-4 space-y-2">
                    <EditableItem
                      text={pp.text}
                      onUpdate={(t) => onEditInsights?.(prev => ({ ...prev, painPoints: prev.painPoints.map(p => p.id === pp.id ? { ...p, text: t } : p) }))}
                      onDelete={() => onEditInsights?.(prev => ({ ...prev, painPoints: prev.painPoints.filter(p => p.id !== pp.id) }))}
                      color="font-semibold"
                    >
                      <VerifyButton items={findMatchingEvidence(pp.text)} type="quotes" />
                    </EditableItem>
                    <div className="flex items-start gap-2 text-xs bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
                      <span className="text-emerald-400 shrink-0 mt-0.5">{"\u2192"}</span>
                      <div><p className="text-emerald-300/90">{pp.fix}</p><p className="text-[10px] text-muted-foreground mt-1">Placement: {pp.placement}</p></div>
                    </div>
                  </div>
                ))}
                <AddItemInput placeholder="Add pain point..." onAdd={(text) => onEditInsights?.(prev => ({ ...prev, painPoints: [...prev.painPoints, { id: `pp-new-${Date.now()}`, text, fix: "", placement: "" }] }))} />
              </div>
            </div>
          )}

          {/* Objection Map (editable) */}
          {editableInsights && editableInsights.objections.length > 0 && (
            <div id={sid("objections")}>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center text-red-400 text-xs">{"\u2718"}</span>
                Shopper Objection Map <ContentInputBadge />
              </h3>
              <div className="space-y-2">
                {editableInsights.objections.map((obj) => (
                  <div key={obj.id} className="gecko-glass rounded-lg p-4 space-y-2">
                    <EditableItem
                      text={obj.objection}
                      onUpdate={(t) => onEditInsights?.(prev => ({ ...prev, objections: prev.objections.map(o => o.id === obj.id ? { ...o, objection: t } : o) }))}
                      onDelete={() => onEditInsights?.(prev => ({ ...prev, objections: prev.objections.filter(o => o.id !== obj.id) }))}
                      color="font-semibold"
                    >
                      <VerifyButton items={findMatchingEvidence(obj.objection)} type="quotes" />
                    </EditableItem>
                    <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/10">
                      <p className="text-[9px] uppercase tracking-wider text-emerald-400/70 font-semibold mb-1">Rebuttal</p>
                      <EditableItem
                        text={obj.rebuttal}
                        onUpdate={(t) => onEditInsights?.(prev => ({ ...prev, objections: prev.objections.map(o => o.id === obj.id ? { ...o, rebuttal: t } : o) }))}
                        onDelete={() => {}}
                        color="text-xs text-muted-foreground"
                      />
                    </div>
                  </div>
                ))}
                <AddItemInput placeholder="Add objection..." onAdd={(text) => onEditInsights?.(prev => ({ ...prev, objections: [...prev.objections, { id: `obj-new-${Date.now()}`, objection: text, rebuttal: "" }] }))} />
              </div>
            </div>
          )}

          {/* Messaging Angles */}
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">Messaging Angles <ContentInputBadge /></h3>
            <div className="space-y-2">
              {insights.messagingAngles.filter(a => matchesPersona(a.targetPersonas, activePersona)).map((angle, i) => {
                const colors = ["border-l-emerald-500", "border-l-blue-500", "border-l-violet-500", "border-l-amber-500", "border-l-rose-500"];
                return (
                  <div key={i} className={`rounded-lg border-l-2 ${colors[i % colors.length]} gecko-glass p-4`}>
                    <p className="font-semibold text-sm">{angle.angle}</p>
                    <p className="text-xs text-muted-foreground italic mt-0.5">&ldquo;{angle.emotionalHook}&rdquo;</p>
                    {angle.proofPoints.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {angle.proofPoints.slice(0, 3).map((pp, j) => (
                          <p key={j} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <span className="text-emerald-400/60 shrink-0">{"\u203A"}</span>{pp}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {(angle.channelFit ?? []).map((ch) => (
                        <span key={ch} className="text-[9px] font-mono uppercase text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{ch}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Review Strategy */}
          {insights.reviewStrategy && (
            <div>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs">{"\u2606"}</span>
                Review Strategy <ContentInputBadge />
              </h3>
              <div className="gecko-glass rounded-xl p-4 space-y-3">
                <p className="text-sm">{insights.reviewStrategy.idealReviewProfile}</p>
                <div className="space-y-2">
                  {insights.reviewStrategy.reviewThemes.filter(t => matchesPersona(t.targetPersonaIds, activePersona)).map((theme, i) => {
                    const impColors = { critical: "border-l-red-500", high: "border-l-amber-500", medium: "border-l-slate-500" };
                    return (
                      <div key={i} className={`gecko-glass rounded-lg p-3 border-l-2 ${impColors[theme.importance] ?? ""}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold">{theme.theme}</span>
                          <span className="text-[8px] uppercase text-muted-foreground">{theme.importance}</span>
                        </div>
                        <div className="bg-muted/10 rounded p-2 mt-1.5">
                          <p className="text-[11px] text-muted-foreground italic">&ldquo;{theme.exampleReview}&rdquo;</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {insights.reviewStrategy.negativeReviewResponses.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/20">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Negative Review Responses</p>
                    {insights.reviewStrategy.negativeReviewResponses.map((resp, i) => (
                      <div key={i} className="gecko-glass rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-red-400">{resp.complaintTheme}</span>
                          <span className="text-[9px] text-muted-foreground">{resp.frequency}</span>
                        </div>
                        <div className="bg-emerald-500/5 rounded p-3 border border-emerald-500/10">
                          <p className="text-[11px] text-muted-foreground">{resp.responseTemplate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Plan */}
          <div>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">{"\uD83C\uDFAF"}</span>
              Action Plan <InfoBadge />
            </h3>
            <div className="space-y-0">
              {insights.recommendations.filter(rec => matchesPersona(rec.personaAlignment, activePersona)).sort((a, b) => a.priority - b.priority).map((rec, i, arr) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      rec.priority === 1 ? "bg-emerald-500 text-white gecko-glow-sm" : rec.priority <= 3 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-muted text-muted-foreground"
                    }`}>{rec.priority}</div>
                    {i < arr.length - 1 && <div className="w-px h-full min-h-[24px] bg-border/50" />}
                  </div>
                  <div className="pb-5 flex-1">
                    <p className="font-medium text-sm">{rec.action}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rec.rationale}</p>
                    {rec.personaAlignment.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {rec.personaAlignment.map((p) => (<Badge key={p} variant="secondary" className="text-[9px] px-1.5 py-0">{p}</Badge>))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

          </div>
        </CollapsibleContent>
      </Collapsible>

    </div>
  );
}
