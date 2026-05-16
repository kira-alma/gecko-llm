"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import type { ShopperPersona, SearchQuery } from "@/lib/types";

const PERSONA_COLORS = [
  "border-l-emerald-500",
  "border-l-blue-500",
  "border-l-amber-500",
  "border-l-violet-500",
  "border-l-rose-500",
  "border-l-cyan-500",
];

const VOLUME_DOT: Record<string, string> = {
  high: "bg-emerald-400",
  medium: "bg-amber-400",
  low: "bg-slate-400",
};

const INTENT_COLOR: Record<string, string> = {
  transactional: "text-violet-400",
  commercial: "text-blue-400",
  informational: "text-cyan-400",
  navigational: "text-gray-400",
};

export function PersonaCard({
  persona,
  index = 0,
  searchQueries,
}: {
  persona: ShopperPersona;
  index?: number;
  searchQueries?: SearchQuery[];
}) {
  const [showSources, setShowSources] = useState(false);
  const [showQueries, setShowQueries] = useState(false);
  const [queryFilter, setQueryFilter] = useState("");
  const [queryLimit, setQueryLimit] = useState(20);
  const borderColor = PERSONA_COLORS[index % PERSONA_COLORS.length];

  // Merge inline searchQueries from persona + structured SearchQuery objects
  const allPersonaQueries = searchQueries?.filter(q => q.personaIds.includes(persona.id)) ?? [];
  const inlineQueries = persona.searchQueries.filter(
    q => !allPersonaQueries.some(aq => aq.query === q)
  );
  const totalQueryCount = allPersonaQueries.length + inlineQueries.length;

  const filteredStructured = queryFilter
    ? allPersonaQueries.filter(q => q.query.toLowerCase().includes(queryFilter.toLowerCase()))
    : allPersonaQueries;
  const filteredInline = queryFilter
    ? inlineQueries.filter(q => q.toLowerCase().includes(queryFilter.toLowerCase()))
    : inlineQueries;
  const totalFiltered = filteredStructured.length + filteredInline.length;

  return (
    <div className={`gecko-glass rounded-lg border-l-2 ${borderColor} overflow-hidden`}>
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-sm">{persona.archetypeName}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{persona.tagline}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              ~{Math.round(persona.clusterCoordinates.estimatedSegmentSize * 100)}%
            </span>
            <p className="text-[8px] text-muted-foreground/50 mt-0.5">est. traffic share</p>
          </div>
        </div>
      </div>

      {/* Quick facts grid */}
      <div className="px-4 pb-3 grid grid-cols-4 gap-2 text-[10px]">
        <div className="bg-muted/20 rounded px-2 py-1.5 text-center">
          <p className="text-muted-foreground">Age</p>
          <p className="font-medium mt-0.5">{persona.demographics.ageRange}</p>
        </div>
        <div className="bg-muted/20 rounded px-2 py-1.5 text-center">
          <p className="text-muted-foreground">Income</p>
          <p className="font-medium mt-0.5">{persona.demographics.incomeLevel}</p>
        </div>
        <div className="bg-muted/20 rounded px-2 py-1.5 text-center">
          <p className="text-muted-foreground">Style</p>
          <p className="font-medium mt-0.5">{persona.psychographics.decisionStyle}</p>
        </div>
        <div className="bg-muted/20 rounded px-2 py-1.5 text-center">
          <p className="text-muted-foreground">Tech</p>
          <p className="font-medium mt-0.5">{persona.demographics.techSavviness}</p>
        </div>
      </div>

      {/* Relevant Categories */}
      {persona.relevantCategories?.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {persona.relevantCategories.map((c) => (
            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/15">
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Values + Pain Points */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex flex-wrap gap-1">
          {persona.psychographics.values.slice(0, 4).map((v) => (
            <span key={v} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {v}
            </span>
          ))}
          {persona.psychographics.painPoints.slice(0, 2).map((p) => (
            <span key={p} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Why this retailer */}
      <div className="px-4 pb-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Why this retailer</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{persona.shoppingBehavior.retailerPreference}</p>
      </div>

      {/* Search Queries — expandable full section */}
      <Collapsible open={showQueries} onOpenChange={setShowQueries}>
        <CollapsibleTrigger className="w-full px-4 py-2.5 text-[11px] font-medium flex items-center justify-between border-t border-border/30 hover:bg-blue-500/5 transition-colors">
          <span className="flex items-center gap-1.5 text-blue-400">
            <span>{showQueries ? "\u25BC" : "\u25B6"}</span>
            Search Queries
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{totalQueryCount} queries</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-2">
            {/* Filter */}
            {totalQueryCount > 10 && (
              <input
                type="text"
                placeholder="Filter queries..."
                value={queryFilter}
                onChange={e => setQueryFilter(e.target.value)}
                onClick={e => e.stopPropagation()}
                className="w-full text-[11px] px-2.5 py-1.5 rounded bg-muted/20 border border-border/30 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-blue-500/30"
              />
            )}

            {/* Structured queries with metadata */}
            <div className="space-y-1">
              {filteredStructured.slice(0, queryLimit).map((q, i) => (
                <div key={i} className="flex items-center gap-2 py-1 group">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${VOLUME_DOT[q.estimatedVolume] ?? "bg-slate-400"}`} />
                  <code className="text-[10px] text-foreground/80 flex-1 break-words">
                    {q.query}
                  </code>
                  <span className={`text-[8px] shrink-0 ${INTENT_COLOR[q.intent] ?? ""}`}>
                    {q.intent}
                  </span>
                  <span className="text-[8px] text-muted-foreground/50 shrink-0 font-mono">
                    {q.estimatedVolume}
                  </span>
                </div>
              ))}
              {/* Inline queries without metadata */}
              {filteredInline.slice(0, Math.max(0, queryLimit - filteredStructured.length)).map((q, i) => (
                <div key={`inline-${i}`} className="flex items-center gap-2 py-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-400/40" />
                  <code className="text-[10px] text-foreground/80 flex-1 break-words">{q}</code>
                </div>
              ))}
            </div>

            {/* Show more / count */}
            {totalFiltered > queryLimit && (
              <button
                onClick={(e) => { e.stopPropagation(); setQueryLimit(l => l + 40); }}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
              >
                Show {Math.min(40, totalFiltered - queryLimit)} more ({totalFiltered - queryLimit} remaining)
              </button>
            )}
            {queryFilter && (
              <p className="text-[9px] text-muted-foreground/50">
                {totalFiltered} of {totalQueryCount} queries match filter
              </p>
            )}

            {/* Volume legend */}
            <div className="flex items-center gap-3 pt-1 border-t border-border/20">
              <span className="text-[8px] text-muted-foreground/50">Volume:</span>
              <span className="flex items-center gap-1 text-[8px] text-muted-foreground/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> high
              </span>
              <span className="flex items-center gap-1 text-[8px] text-muted-foreground/50">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> medium
              </span>
              <span className="flex items-center gap-1 text-[8px] text-muted-foreground/50">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> low
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Sources */}
      <Collapsible open={showSources} onOpenChange={setShowSources}>
        <CollapsibleTrigger className="w-full px-4 py-2.5 text-[11px] font-medium flex items-center justify-between border-t border-border/30 hover:bg-emerald-500/5 transition-colors">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span>{showSources ? "\u25BC" : "\u25B6"}</span>
            Supporting Quotes
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{persona.sourceEvidence.length} from Reddit, reviews & forums</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-1.5">
            {persona.sourceEvidence.map((s, i) => (
              <div key={i} className="text-[11px] p-2 rounded bg-muted/20 space-y-1">
                <p className="italic text-muted-foreground">&ldquo;{s.text}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">{s.source}</span>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline text-[9px]">
                      source {"\u2192"}
                    </a>
                  )}
                </div>
                <p className="text-[9px] text-emerald-400/60">{s.relevance}</p>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
