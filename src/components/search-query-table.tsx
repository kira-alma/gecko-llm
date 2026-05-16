"use client";

import type { SearchQuery } from "@/lib/types";

const VOLUME_STYLES: Record<string, { bg: string; dot: string }> = {
  high: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  medium: { bg: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  low: { bg: "bg-slate-500/10 text-slate-400 border-slate-500/20", dot: "bg-slate-400" },
};

const INTENT_STYLES: Record<string, string> = {
  transactional: "text-violet-400",
  commercial: "text-blue-400",
  informational: "text-cyan-400",
  navigational: "text-gray-400",
};

export function SearchQueryTable({ queries }: { queries: SearchQuery[] }) {
  // Sort: high volume first
  const sorted = [...queries].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.estimatedVolume] ?? 3) - (order[b.estimatedVolume] ?? 3);
  });

  return (
    <div className="space-y-3">
      <div className="gecko-glass rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border/30">
          <div className="col-span-6">Query</div>
          <div className="col-span-2 text-center">Volume</div>
          <div className="col-span-2 text-center">Intent</div>
          <div className="col-span-2 text-center">Personas</div>
        </div>
        {/* Rows */}
        <div className="divide-y divide-border/20 gecko-stagger">
          {sorted.map((q, i) => {
            const vol = VOLUME_STYLES[q.estimatedVolume] ?? VOLUME_STYLES.low;
            const intentColor = INTENT_STYLES[q.intent] ?? "text-gray-400";
            return (
              <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center hover:bg-muted/10 transition-colors group">
                <div className="col-span-6 flex items-center gap-2">
                  <code className="text-xs text-foreground/90 group-hover:text-foreground transition-colors">
                    &ldquo;{q.query}&rdquo;
                  </code>
                  {q.retailerSpecific && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                      retailer
                    </span>
                  )}
                </div>
                <div className="col-span-2 flex justify-center">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${vol.bg}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${vol.dot}`} />
                    {q.estimatedVolume}
                  </span>
                </div>
                <div className="col-span-2 text-center">
                  <span className={`text-[10px] font-medium ${intentColor}`}>
                    {q.intent}
                  </span>
                </div>
                <div className="col-span-2 text-center text-[9px] text-muted-foreground">
                  {q.personaIds.join(", ")}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/60 italic pl-1">
        Volume estimates are tier-based approximations based on query specificity and category patterns.
      </p>
    </div>
  );
}
