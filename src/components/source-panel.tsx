"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { SourceQuote, ResearchStats } from "@/lib/types";

const SOURCE_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  reddit: { bg: "bg-orange-500/10", text: "text-orange-400", label: "Reddit" },
  reviews: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Reviews" },
  forums: { bg: "bg-violet-500/10", text: "text-violet-400", label: "Forums" },
  articles: { bg: "bg-cyan-500/10", text: "text-cyan-400", label: "Articles" },
  guides: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Guides" },
};

export function SourcePanel({
  sources,
  methodology,
  researchStats,
}: {
  sources: SourceQuote[];
  methodology?: string;
  researchStats?: ResearchStats | null;
}) {
  const stats = researchStats;
  const totalSources = stats?.totalSourcesScanned ?? sources.length;

  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-semibold gecko-glass px-4 py-2 hover:bg-muted/20 cursor-pointer transition-all">
        <span className="w-2 h-2 rounded-full bg-emerald-400 gecko-pulse" />
        {totalSources} Sources Analyzed
      </SheetTrigger>
      <SheetContent className="w-[480px] sm:w-[560px] p-0">
        <div className="p-6 pb-0">
          <SheetHeader>
            <SheetTitle className="text-lg">Evidence Dashboard</SheetTitle>
          </SheetHeader>

          {/* Hero stats */}
          {stats && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="gecko-glass rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-emerald-400">{stats.totalSourcesScanned}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Sources Scanned</p>
              </div>
              <div className="gecko-glass rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-blue-400">{(stats.totalWordsAnalyzed / 1000).toFixed(0)}K</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Words Analyzed</p>
              </div>
              <div className="gecko-glass rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-violet-400">{stats.totalQuotesExtracted}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">Quotes Extracted</p>
              </div>
            </div>
          )}

          {/* Source breakdown bar */}
          {stats && (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Source Breakdown</p>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {Object.entries(stats.breakdown)
                  .filter(([, count]) => count > 0)
                  .map(([type, count]) => {
                    const pct = (count / stats.totalSourcesScanned) * 100;
                    const colors: Record<string, string> = {
                      reddit: "bg-orange-500",
                      reviews: "bg-blue-500",
                      forums: "bg-violet-500",
                      articles: "bg-cyan-500",
                      guides: "bg-emerald-500",
                    };
                    return (
                      <div
                        key={type}
                        className={`${colors[type] ?? "bg-gray-500"} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${type}: ${count}`}
                      />
                    );
                  })}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.breakdown)
                  .filter(([, count]) => count > 0)
                  .map(([type, count]) => {
                    const style = SOURCE_TYPE_COLORS[type] ?? SOURCE_TYPE_COLORS.articles;
                    return (
                      <span key={type} className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${style.text}`}>
                        <span className={`w-2 h-2 rounded-full ${style.bg.replace("/10", "")}`}
                          style={{ backgroundColor: `var(--tw-${type}-color, currentColor)`, opacity: 0.6 }}
                        />
                        {style.label}: {count}
                      </span>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="queries" className="mt-4">
          <div className="px-6">
            <TabsList className="w-full bg-muted/30 p-1 rounded-lg">
              <TabsTrigger value="queries" className="flex-1 rounded-md text-xs">
                Research Queries
              </TabsTrigger>
              <TabsTrigger value="evidence" className="flex-1 rounded-md text-xs">
                Key Evidence
              </TabsTrigger>
              <TabsTrigger value="pages" className="flex-1 rounded-md text-xs">
                All Pages
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[calc(100vh-380px)] mt-3">
            {/* Research Queries Tab */}
            <TabsContent value="queries" className="px-6 pb-6">
              <div className="space-y-2">
                {methodology && (
                  <div className="gecko-glass-accent rounded-lg p-3 mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">Methodology</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{methodology}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mb-2">
                  {stats?.researchQueries.length ?? 0} research queries executed to build persona models
                </p>
                {stats?.researchQueries.map((rq, i) => {
                  const style = SOURCE_TYPE_COLORS[rq.sourceType] ?? SOURCE_TYPE_COLORS.articles;
                  return (
                    <div key={i} className="gecko-glass rounded-lg p-3 flex items-start gap-3 hover:bg-muted/10 transition-all">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.bg} ${style.text} shrink-0 mt-0.5`}>
                        {style.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <code className="text-[11px] text-foreground/90 break-words leading-relaxed">
                          {rq.query}
                        </code>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {rq.resultCount} results
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Key Evidence Tab */}
            <TabsContent value="evidence" className="px-6 pb-6">
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground mb-2">
                  {sources.length} key quotes extracted and linked to persona models
                </p>
                <EvidenceByTheme sources={sources} />
              </div>
            </TabsContent>

            {/* All Pages Tab */}
            <TabsContent value="pages" className="px-6 pb-6">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground mb-2">
                  {stats?.scannedPages.length ?? 0} pages scanned during research
                </p>
                {stats?.scannedPages.map((page, i) => {
                  const style = SOURCE_TYPE_COLORS[page.sourceType] ?? SOURCE_TYPE_COLORS.articles;
                  return (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/10 group">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.bg.replace("/10", "")}`}
                        style={{ opacity: 0.6, backgroundColor: "currentColor" }}
                      />
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-muted-foreground group-hover:text-emerald-400 truncate flex-1 transition-colors"
                      >
                        {page.title || page.url}
                      </a>
                      <span className={`text-[8px] uppercase tracking-wider ${style.text} shrink-0`}>
                        {style.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function EvidenceByTheme({ sources }: { sources: SourceQuote[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Group by source name
  const grouped = new Map<string, SourceQuote[]>();
  for (const s of sources) {
    const key = s.source;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(s);
  }

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([source, quotes]) => (
        <div key={source} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[9px]">{source}</Badge>
            <span className="text-[10px] text-muted-foreground">
              {quotes.length} quote{quotes.length !== 1 ? "s" : ""}
            </span>
          </div>
          {quotes.map((q, i) => {
            const globalIdx = sources.indexOf(q);
            const isExpanded = expanded.has(globalIdx);
            return (
              <div
                key={i}
                className="gecko-glass rounded-lg p-2.5 text-[11px] space-y-1 hover:bg-muted/10 transition-all cursor-pointer"
                onClick={() => {
                  const next = new Set(expanded);
                  if (isExpanded) next.delete(globalIdx);
                  else next.add(globalIdx);
                  setExpanded(next);
                }}
              >
                <p className="italic text-muted-foreground leading-relaxed">
                  {isExpanded ? q.text : q.text.length > 120 ? q.text.slice(0, 120) + "..." : q.text}
                </p>
                {isExpanded && (
                  <>
                    <p className="text-[10px] text-emerald-400/70">{q.relevance}</p>
                    {q.url && (
                      <a
                        href={q.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-emerald-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View source {"\u2192"}
                      </a>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
