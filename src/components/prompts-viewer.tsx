"use client";

import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  EVIDENCE_EXTRACTION_SYSTEM_PROMPT,
  PERSONA_SYNTHESIS_SYSTEM_PROMPT,
  QUERY_EXPANSION_SYSTEM_PROMPT,
  EVIDENCE_EXPANSION_SYSTEM_PROMPT,
} from "@/lib/prompts/personas";
import {
  RESEARCH_SYSTEM_PROMPT,
} from "@/lib/prompts/research";
import {
  INSIGHTS_SYSTEM_PROMPT,
} from "@/lib/prompts/insights";
import {
  CAMPAIGN_SYSTEM_PROMPT,
} from "@/lib/prompts/content";

interface PromptEntry {
  id: string;
  stage: string;
  name: string;
  type: "system" | "user_template";
  callsPerRetailer: string;
  content: string;
}

const PROMPTS: PromptEntry[] = [
  { id: "research-system", stage: "Stage 1", name: "Product Research", type: "system", callsPerRetailer: "1 (shared)", content: RESEARCH_SYSTEM_PROMPT },
  { id: "evidence-extraction-system", stage: "Stage 2a", name: "Evidence Extraction", type: "system", callsPerRetailer: "1", content: EVIDENCE_EXTRACTION_SYSTEM_PROMPT },
  { id: "persona-synthesis-system", stage: "Stage 2b", name: "Persona Synthesis", type: "system", callsPerRetailer: "1", content: PERSONA_SYNTHESIS_SYSTEM_PROMPT },
  { id: "query-expansion-system", stage: "Stage 2c", name: "Query Expansion", type: "system", callsPerRetailer: "1 per persona", content: QUERY_EXPANSION_SYSTEM_PROMPT },
  { id: "evidence-expansion-system", stage: "Stage 2d", name: "Evidence Expansion", type: "system", callsPerRetailer: "1 per persona", content: EVIDENCE_EXPANSION_SYSTEM_PROMPT },
  { id: "insights-system", stage: "Stage 3", name: "Insight Generation", type: "system", callsPerRetailer: "1", content: INSIGHTS_SYSTEM_PROMPT },
  { id: "campaign-system", stage: "Stage 4", name: "Campaign & Ad Copy", type: "system", callsPerRetailer: "1", content: CAMPAIGN_SYSTEM_PROMPT },
];

const STAGE_COLORS: Record<string, string> = {
  "Stage 1": "text-cyan-400 bg-cyan-500/15 border-cyan-500/20",
  "Stage 2a": "text-blue-400 bg-blue-500/15 border-blue-500/20",
  "Stage 2b": "text-blue-400 bg-blue-500/15 border-blue-500/20",
  "Stage 2c": "text-blue-400 bg-blue-500/15 border-blue-500/20",
  "Stage 2d": "text-blue-400 bg-blue-500/15 border-blue-500/20",
  "Stage 3": "text-amber-400 bg-amber-500/15 border-amber-500/20",
  "Stage 4": "text-violet-400 bg-violet-500/15 border-violet-500/20",
};

export function PromptsViewer() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string; provider: string; inputPrice?: string; outputPrice?: string }[]>([]);
  const [modelSaving, setModelSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      setActiveModel(data.activeModel);
      setAvailableModels(data.availableModels);
    }).catch(() => {});
  }, []);

  const changeModel = async (modelId: string) => {
    setModelSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelId }),
    });
    setActiveModel(modelId);
    setModelSaving(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Model selector */}
      <div className="gecko-glass rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm">
            {"\u2699"}
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Model</h3>
            <p className="text-[10px] text-muted-foreground">Model used for all LLM calls. Changes apply to new analyses only.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeModel}
            onChange={(e) => changeModel(e.target.value)}
            disabled={modelSaving}
            className="flex-1 h-9 rounded-lg bg-muted/20 border border-border/50 px-3 text-sm text-foreground focus:border-emerald-500/50 focus:outline-none"
          >
            {availableModels.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider}) — {m.inputPrice}/MTok in, {m.outputPrice}/MTok out
              </option>
            ))}
          </select>
          <span className="text-[9px] text-muted-foreground font-mono shrink-0">
            {modelSaving ? "Saving..." : "via OpenRouter"}
          </span>
        </div>

        {(() => {
          const m = availableModels.find(m => m.id === activeModel);
          return m ? (
            <p className="text-[9px] text-muted-foreground/50">
              Active: <code className="text-emerald-400/70">{activeModel}</code>
              {" "}{"\u00B7"}{" "}
              <span className="text-foreground/60">{m.inputPrice}/MTok input, {m.outputPrice}/MTok output</span>
              {" "}{"\u00B7"}{" "}
              ~${(parseFloat((m.inputPrice ?? "$0").replace("$","")) * 0.05 + parseFloat((m.outputPrice ?? "$0").replace("$","")) * 0.03).toFixed(2)}/analysis (est.)
            </p>
          ) : (
            <p className="text-[9px] text-muted-foreground/50">
              Active: <code className="text-emerald-400/70">{activeModel}</code>
            </p>
          );
        })()}
      </div>

      {/* Pipeline overview */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground text-sm">
            {"\u2699"}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Pipeline Prompts</h3>
            <p className="text-[10px] text-muted-foreground">System prompts used at each stage. Click to expand.</p>
          </div>
        </div>

        <div className="gecko-glass rounded-lg p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded border text-cyan-400 bg-cyan-500/15 border-cyan-500/20 text-[10px] font-semibold">1: Research</span>
            <span className="text-muted-foreground/30">{"\u2192"}</span>
            <span className="px-2 py-1 rounded border text-blue-400 bg-blue-500/15 border-blue-500/20 text-[10px] font-semibold">2: Personas (4 sub-calls)</span>
            <span className="text-muted-foreground/30">{"\u2192"}</span>
            <span className="px-2 py-1 rounded border text-amber-400 bg-amber-500/15 border-amber-500/20 text-[10px] font-semibold">3: Insights</span>
            <span className="text-muted-foreground/30">{"\u2192"}</span>
            <span className="px-2 py-1 rounded border text-violet-400 bg-violet-500/15 border-violet-500/20 text-[10px] font-semibold">4: Content</span>
          </div>
        </div>
      </div>

      {/* Prompt list */}
      <div className="space-y-2">
        {PROMPTS.map((prompt) => {
          const stageColor = STAGE_COLORS[prompt.stage] ?? "";
          const isExpanded = expandedId === prompt.id;

          return (
            <Collapsible
              key={prompt.id}
              open={isExpanded}
              onOpenChange={(open) => setExpandedId(open ? prompt.id : null)}
            >
              <CollapsibleTrigger className="w-full text-left">
                <div className={`gecko-glass rounded-lg p-3 flex items-center gap-3 transition-all cursor-pointer ${isExpanded ? "ring-1 ring-emerald-500/30" : "hover:bg-muted/10"}`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${stageColor}`}>
                    {prompt.stage}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{prompt.name}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0 font-mono">{prompt.callsPerRetailer}</span>
                  <span className="text-muted-foreground/50 text-xs shrink-0">{isExpanded ? "\u25BC" : "\u25B6"}</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 rounded-lg border border-border/30 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted/10 border-b border-border/20">
                    <span className="text-[9px] text-muted-foreground font-mono">system prompt</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(prompt.content, prompt.id); }}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium px-2 py-0.5 rounded hover:bg-emerald-500/10 transition-colors"
                    >
                      {copied === prompt.id ? "\u2713 Copied" : "Copy"}
                    </button>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    <pre className="p-3 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">
                      {prompt.content}
                    </pre>
                  </ScrollArea>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
