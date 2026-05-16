"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PipelineEvent } from "@/lib/types";

const RETAILER_COLORS: Record<string, string> = {
  Amazon: "#FF9900",
  Walmart: "#0071DC",
  Target: "#CC0000",
  Costco: "#E31837",
  "Best Buy": "#0046BE",
};

// Define the actual pipeline steps for realistic progress
const PIPELINE_STEPS = [
  "Searching Reddit",
  "Analyzing reviews",
  "Researching competitors",
  "Extracting evidence",
  "Building personas",
  "Expanding queries",
  "Expanding evidence",
  "Generating insights",
];

export function PipelineProgress({
  events,
  discoveries,
  progress: _progress,
  currentMessage,
  isComplete,
  error,
  retailers,
  onViewResults,
}: {
  events: PipelineEvent[];
  discoveries: PipelineEvent[];
  progress: number;
  currentMessage: string;
  isComplete: boolean;
  error: string | null;
  retailers: string[];
  onViewResults: () => void;
}) {
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    if (isComplete || error) return;
    // Use wall-clock time — accurate even after screen lock/sleep
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [isComplete, error, startTime]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Compute REALISTIC progress from actual events per retailer
  const retailerStatus = new Map<string, {
    stage: string;
    done: boolean;
    failed: boolean;
    errorDetail: string;
    stepsCompleted: number;
    currentStep: string;
  }>();

  for (const r of retailers) {
    retailerStatus.set(r, { stage: "Queued", done: false, failed: false, errorDetail: "", stepsCompleted: 0, currentStep: "" });
  }

  for (const e of events) {
    if (e.retailer) {
      const key = retailers.find(
        (r) => r.toLowerCase() === e.retailer!.toLowerCase()
      ) ?? e.retailer;
      const current = retailerStatus.get(key)!;

      if (e.type === "stage_complete" && e.stage === "content") {
        retailerStatus.set(key, { ...current, stage: "Complete", done: true, failed: false, errorDetail: "", stepsCompleted: PIPELINE_STEPS.length });
      } else if (e.type === "error") {
        retailerStatus.set(key, { ...current, stage: "Failed", done: false, failed: true, errorDetail: e.message });
      } else {
        // Map message to step index for realistic progress
        // Steps are 0-indexed internally: 0=not started, 1-7=in progress, 8=done
        // Only stage_complete events (handled above) should reach 8
        const msg = e.message.toLowerCase();
        let step = current.stepsCompleted;
        if (msg.includes("reddit") || msg.includes("mining")) step = Math.max(step, 1);
        if (msg.includes("review") || msg.includes("forum")) step = Math.max(step, 2);
        if (msg.includes("competitor")) step = Math.max(step, 3);
        if (msg.includes("extracting") || msg.includes("behavior pattern")) step = Math.max(step, 4);
        if (msg.includes("building") || msg.includes("persona")) step = Math.max(step, 5);
        if (msg.includes("expanding")) step = Math.max(step, 6);
        if (msg.includes("insight") || msg.includes("positioning")) step = Math.max(step, 7);
        // Cap at 7 (not 8) — only stage_complete marks full completion
        step = Math.min(step, PIPELINE_STEPS.length - 1);

        retailerStatus.set(key, {
          ...current,
          stage: e.message,
          done: false,
          failed: false,
          errorDetail: "",
          stepsCompleted: step,
          currentStep: PIPELINE_STEPS[Math.min(step, PIPELINE_STEPS.length - 1)] ?? "",
        });
      }
    }
  }

  // Compute overall progress from retailer step completion
  const totalSteps = retailers.length * PIPELINE_STEPS.length;
  const completedSteps = Array.from(retailerStatus.values()).reduce((sum, r) => sum + r.stepsCompleted, 0);
  const realisticProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto gecko-bg-mesh min-h-[60vh] flex flex-col items-center justify-center gap-8 py-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">
          {isComplete ? (
            <span className="gecko-gradient-text">Analysis Complete</span>
          ) : error ? (
            <span className="text-red-400">Analysis Failed</span>
          ) : (
            "Analyzing..."
          )}
        </h2>
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          <span className="font-mono">{formatTime(elapsed)}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span>{currentMessage}</span>
        </div>
      </div>

      {/* Progress bar — clickable to toggle log */}
      <div className="w-full max-w-md space-y-2">
        <button
          onClick={() => setShowLog(!showLog)}
          className="w-full text-left"
        >
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress <span className="text-muted-foreground/40">(click for details)</span></span>
            <span className="font-mono font-bold text-foreground">{isComplete ? 100 : realisticProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden mt-1">
            <div
              className="h-full rounded-full gecko-progress-gradient transition-all duration-700 ease-out"
              style={{ width: `${isComplete ? 100 : realisticProgress}%` }}
            />
          </div>
          <p className="text-[9px] text-muted-foreground/40 mt-1">
            {completedSteps}/{totalSteps} steps completed across {retailers.length} retailer{retailers.length !== 1 ? "s" : ""}
          </p>
        </button>
      </div>

      {/* Detailed log — shown when progress bar is clicked */}
      {showLog && (
        <div className="w-full gecko-glass rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-border/20 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Pipeline Log</span>
            <span className="text-[9px] text-muted-foreground">{events.length} events</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2 space-y-0.5">
              {[...events].reverse().map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px] py-0.5 px-2 rounded hover:bg-muted/5">
                  <span className="text-muted-foreground/40 font-mono shrink-0 w-16">
                    {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span className={`shrink-0 w-14 font-mono ${
                    e.type === "error" ? "text-red-400" :
                    e.type === "stage_complete" ? "text-emerald-400" :
                    e.type === "discovery" ? "text-blue-400" :
                    "text-muted-foreground/60"
                  }`}>
                    {e.type === "stage_start" ? "START" :
                     e.type === "stage_progress" ? "PROG" :
                     e.type === "stage_complete" ? "DONE" :
                     e.type === "discovery" ? "FOUND" :
                     e.type === "error" ? "ERROR" :
                     e.type === "complete" ? "DONE" : e.type}
                  </span>
                  {e.retailer && (
                    <span className="text-foreground/50 shrink-0 w-16 truncate">{e.retailer}</span>
                  )}
                  <span className="text-muted-foreground flex-1">{e.message}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Retailer rows */}
      <div className="w-full space-y-2">
        {retailers.map((r) => {
          const status = retailerStatus.get(r) ?? { stage: "Queued", done: false, failed: false, errorDetail: "", stepsCompleted: 0, currentStep: "" };
          const color = RETAILER_COLORS[r] ?? "#6b7280";
          const stepPct = (status.stepsCompleted / PIPELINE_STEPS.length) * 100;
          return (
            <div key={r} className="space-y-0">
              <div className="gecko-glass rounded-lg px-4 py-3 flex items-center gap-3">
                {/* Status dot */}
                <div className="relative">
                  <div
                    className={`w-3 h-3 rounded-full ${status.done ? "" : status.failed ? "" : "gecko-pulse"}`}
                    style={{ backgroundColor: status.done ? "#10b981" : status.failed ? "#ef4444" : color }}
                  />
                </div>
                {/* Retailer name */}
                <span className="font-medium text-sm w-24 shrink-0 capitalize">{r}</span>
                {/* Step progress bar */}
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${status.done ? 100 : stepPct}%`,
                        backgroundColor: status.done ? "#10b981" : status.failed ? "#ef4444" : color,
                        opacity: status.done ? 1 : 0.7,
                      }}
                    />
                  </div>
                  {!status.done && !status.failed && status.currentStep && (
                    <p className="text-[9px] text-muted-foreground/50">
                      Step {status.stepsCompleted}/{PIPELINE_STEPS.length}: {status.currentStep}
                    </p>
                  )}
                </div>
                {/* Badge */}
                <Badge
                  variant={status.done ? "default" : "secondary"}
                  className={`text-[10px] px-2 min-w-[52px] justify-center ${status.done ? "bg-emerald-600 text-white" : status.failed ? "bg-red-600 text-white" : ""}`}
                >
                  {status.done ? "Done" : status.failed ? "Error" : `${Math.round(stepPct)}%`}
                </Badge>
              </div>
              {/* Full error message */}
              {status.failed && status.errorDetail && (
                <div className="mx-2 p-3 rounded-b-lg bg-red-500/5 border border-red-500/10 border-t-0">
                  <p className="text-[10px] text-red-400/90 font-mono whitespace-pre-wrap break-all leading-relaxed">
                    {status.errorDetail}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Discoveries feed */}
      {discoveries.length > 0 && (
        <div className="w-full space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Live Discoveries
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto gecko-stagger">
            {discoveries.slice(-8).map((d, i) => (
              <div
                key={i}
                className="text-xs py-2 px-3 rounded-lg gecko-glass flex items-start gap-2"
              >
                <span className="text-emerald-400 shrink-0 mt-0.5">{"\u2713"}</span>
                <span>{d.discovery || d.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="w-full p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* CTA */}
      {isComplete && (
        <button
          onClick={onViewResults}
          className="px-10 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-base transition-all gecko-glow-emerald hover:scale-[1.02] active:scale-[0.98]"
        >
          View Results
        </button>
      )}
    </div>
  );
}
