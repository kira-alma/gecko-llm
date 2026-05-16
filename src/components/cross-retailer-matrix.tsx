"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { RetailerResult } from "@/lib/types";

const RETAILER_COLORS: Record<string, string> = {
  amazon: "#FF9900",
  walmart: "#0071DC",
  target: "#CC0000",
  costco: "#E31837",
  bestbuy: "#0046BE",
};

export function CrossRetailerMatrix({
  retailerResults,
  onNavigate,
}: {
  retailerResults: RetailerResult[];
  onNavigate?: (retailerSlug: string, section: string) => void;
}) {
  const [showMethodology, setShowMethodology] = useState(false);
  const completed = retailerResults.filter(r => r.status === "completed" && r.competitivePositioning);

  if (completed.length < 2) return null;

  const retailerScores = completed.map(r => {
    const insights = r.competitivePositioning!;
    const readiness = insights.contentReadiness?.overallScore ?? 0;
    const usps = insights.competitivePositioning.uniqueSellingPoints.length;
    const vulns = insights.competitivePositioning.vulnerabilities.length;
    const painFixesMissing = insights.painPointFixes?.filter(f => f.currentCoverage === "missing").length ?? 0;
    const painFixesCovered = insights.painPointFixes?.filter(f => f.currentCoverage === "covered").length ?? 0;
    const keywordGapsCritical = insights.keywordGaps?.filter(k => k.priority === "critical").length ?? 0;
    const objHigh = insights.objectionMap?.filter(o => o.severity === "high").length ?? 0;

    const opportunityScore = readiness + (usps * 8) - (vulns * 10) + (painFixesCovered * 5);

    return {
      retailerName: r.retailerName,
      retailerSlug: r.retailerSlug,
      readiness,
      readinessCategories: insights.contentReadiness?.categories ?? [],
      usps,
      uspList: insights.competitivePositioning.uniqueSellingPoints,
      vulns,
      vulnList: insights.competitivePositioning.vulnerabilities,
      painFixesMissing,
      painFixesCovered,
      keywordGapsCritical,
      objHigh,
      opportunityScore,
    };
  });

  const sorted = [...retailerScores].sort((a, b) => b.opportunityScore - a.opportunityScore);
  const maxOpp = Math.max(...sorted.map(s => s.opportunityScore), 1);

  const nav = (slug: string, section: string) => {
    onNavigate?.(slug, section);
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm">
          {"\u2B1B"}
        </div>
        <div>
          <h3 className="text-lg font-semibold">Cross-Retailer Opportunity Matrix</h3>
          <p className="text-xs text-muted-foreground">Where to focus investment based on positioning strength and content gaps</p>
        </div>
      </div>

      <div className="gecko-glass rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 text-[9px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/30">
          <div className="col-span-2">Retailer</div>
          <div className="col-span-2 text-center">Readiness</div>
          <div className="col-span-2 text-center">Opportunity</div>
          <div className="col-span-6">Key Factors <span className="normal-case tracking-normal font-normal text-muted-foreground/40">(click to navigate)</span></div>
        </div>

        {/* Rows */}
        {sorted.map((r, i) => {
          const color = RETAILER_COLORS[r.retailerSlug] ?? "#6b7280";
          const oppPct = (r.opportunityScore / maxOpp) * 100;
          return (
            <div key={r.retailerSlug}>
              <div className={`grid grid-cols-12 gap-2 px-4 py-4 items-center border-b border-border/10 ${i === 0 ? "bg-emerald-500/5" : ""}`}>
                {/* Retailer */}
                <div className="col-span-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-sm font-semibold">{r.retailerName}</span>
                  {i === 0 && (
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Best</span>
                  )}
                </div>

                {/* Readiness — clickable */}
                <div className="col-span-2">
                  <button
                    onClick={() => nav(r.retailerSlug, "readiness")}
                    className="w-full text-left space-y-1 hover:bg-muted/10 rounded p-1 -m-1 transition-colors cursor-pointer"
                    title="Click to see readiness breakdown"
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className={`text-sm font-bold ${r.readiness >= 60 ? "text-emerald-400" : r.readiness >= 40 ? "text-amber-400" : "text-red-400"}`}>
                        {r.readiness}/100
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted/20">
                      <div
                        className={`h-full rounded-full ${r.readiness >= 60 ? "bg-emerald-500" : r.readiness >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${r.readiness}%` }}
                      />
                    </div>
                  </button>
                </div>

                {/* Opportunity */}
                <div className="col-span-2 space-y-1">
                  <div className="h-6 rounded bg-muted/10 overflow-hidden flex items-center">
                    <div
                      className="h-full rounded transition-all duration-500 flex items-center px-2"
                      style={{ width: `${Math.max(oppPct, 15)}%`, backgroundColor: color, opacity: 0.7 }}
                    >
                      <span className="text-[9px] text-white font-bold">{Math.round(r.opportunityScore)}</span>
                    </div>
                  </div>
                </div>

                {/* Key factors — each clickable */}
                <div className="col-span-6 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => nav(r.retailerSlug, "positioning")}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                    title={`Strengths: ${r.uspList.join(', ')}`}
                  >
                    {r.usps} strengths
                  </button>
                  <button
                    onClick={() => nav(r.retailerSlug, "positioning")}
                    className={`text-[9px] px-1.5 py-0.5 rounded border hover:opacity-80 transition-colors cursor-pointer ${r.vulns > 2 ? "bg-red-500/10 text-red-400 border-red-500/15" : "bg-amber-500/10 text-amber-400 border-amber-500/15"}`}
                    title={`Risks: ${r.vulnList.join(', ')}`}
                  >
                    {r.vulns} risks
                  </button>
                  <button
                    onClick={() => nav(r.retailerSlug, "painpoints")}
                    className={`text-[9px] px-1.5 py-0.5 rounded border hover:opacity-80 transition-colors cursor-pointer ${r.painFixesMissing > 3 ? "bg-red-500/10 text-red-400 border-red-500/15" : "bg-slate-500/10 text-slate-400 border-slate-500/15"}`}
                  >
                    {r.painFixesMissing} pain point gaps
                  </button>
                  {r.keywordGapsCritical > 0 && (
                    <button
                      onClick={() => nav(r.retailerSlug, "keywords")}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/15 hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      {r.keywordGapsCritical} critical keywords
                    </button>
                  )}
                  {r.objHigh > 0 && (
                    <button
                      onClick={() => nav(r.retailerSlug, "objections")}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/15 hover:bg-orange-500/20 transition-colors cursor-pointer"
                    >
                      {r.objHigh} high-severity objections
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Methodology */}
      <Collapsible open={showMethodology} onOpenChange={setShowMethodology}>
        <CollapsibleTrigger className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1">
          <span>{showMethodology ? "\u25BC" : "\u25B6"}</span>
          How are these scores calculated?
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 gecko-glass rounded-lg p-4 text-xs text-muted-foreground space-y-2">
            <p>
              <span className="font-semibold text-foreground">Readiness (0-100):</span> How well your product content matches what shoppers actually search for. Calculated from 5 areas: pain point coverage (do you address shopper concerns?), keyword coverage (do the right search terms appear in your content?), objection handling (are common hesitations addressed?), competitive differentiation (do you stand out from competitors?), and persona alignment (does your content speak to each shopper type?).
            </p>
            <p>
              <span className="font-semibold text-foreground">Opportunity:</span> Combines readiness with competitive factors. Strengths add points, risks and gaps subtract. Higher = better starting position with fewer problems to fix.
            </p>
            <p>
              <span className="font-semibold text-foreground">Key Factors:</span> Click any pill to jump directly to the section that explains what's behind that number.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Summary */}
      <div className="gecko-glass-accent rounded-lg p-3 text-xs">
        <span className="font-semibold text-emerald-400">Recommendation: </span>
        <span className="text-muted-foreground">
          Focus investment on <span className="text-foreground font-medium">{sorted[0]?.retailerName}</span> (strongest opportunity).
          {sorted.length > 1 && sorted[sorted.length - 1].readiness < 40 && (
            <> Address critical content gaps on <span className="text-foreground font-medium">{sorted[sorted.length - 1].retailerName}</span> (readiness {sorted[sorted.length - 1].readiness}/100).</>
          )}
        </span>
      </div>
    </div>
  );
}
