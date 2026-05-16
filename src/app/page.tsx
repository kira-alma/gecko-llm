"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductInput } from "@/components/product-input";
import { Badge } from "@/components/ui/badge";
import type { Analysis } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  useEffect(() => {
    fetch("/api/analyses")
      .then((r) => r.json())
      .then(setAnalyses)
      .catch(() => {});
  }, []);

  const handleSubmit = async (productName: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName }),
      });
      const analysis = await res.json();
      router.push(`/analysis/${analysis.id}`);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-gray-500", label: "Pending" },
    researching: { color: "bg-amber-500", label: "Researching" },
    generating_personas: { color: "bg-blue-500", label: "Personas" },
    generating_insights: { color: "bg-violet-500", label: "Insights" },
    generating_content: { color: "bg-purple-500", label: "Content" },
    completed: { color: "bg-emerald-500", label: "Complete" },
    failed: { color: "bg-red-500", label: "Failed" },
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 gap-16 gecko-bg-mesh">
      {/* Hero */}
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold tracking-tight gecko-gradient-text">
          GeckoLLM
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          AI-powered retail intelligence. Enter a product, understand every retailer.
        </p>
      </div>

      {/* Two paths */}
      <div className="w-full max-w-3xl mx-auto grid grid-cols-2 gap-4">
        {/* Quick Start */}
        <div className="gecko-glass rounded-xl p-6 space-y-4" style={{ borderLeft: "3px solid #10b981" }}>
          <div>
            <h3 className="font-semibold text-emerald-400">Quick Start</h3>
            <p className="text-xs text-muted-foreground mt-1">Enter a product name and we'll research it automatically</p>
          </div>
          <ProductInput onSubmit={handleSubmit} isLoading={isLoading} />
        </div>

        {/* Full Product Brief */}
        <div
          className="gecko-glass rounded-xl p-6 space-y-4 cursor-pointer hover:bg-muted/5 transition-colors"
          style={{ borderLeft: "3px solid #8b5cf6" }}
          onClick={() => router.push("/brief")}
        >
          <div>
            <h3 className="font-semibold text-violet-400">Full Product Brief</h3>
            <p className="text-xs text-muted-foreground mt-1">I have detailed product information, competitors, and categories to share</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-violet-400 font-medium">
            Go to form {"\u2192"}
          </div>
        </div>
      </div>

      {analyses.length > 0 && (
        <div className="w-full max-w-2xl space-y-3">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Recent Analyses
          </h3>
          <div className="gecko-stagger">
            {analyses.slice(0, 10).map((a) => {
              const status = statusConfig[a.status] ?? statusConfig.pending;
              return (
                <div
                  key={a.id}
                  className="gecko-glass rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-all group mb-2"
                  onClick={() => router.push(`/analysis/${a.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${status.color} ${a.status === "completed" ? "" : "gecko-pulse"}`} />
                    <div>
                      <p className="font-medium text-sm group-hover:text-emerald-400 transition-colors">
                        {a.productName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
                        {a.selectedRetailers.length > 0 &&
                          ` \u00B7 ${a.selectedRetailers.length} retailers`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-[9px] font-medium"
                    >
                      {status.label}
                    </Badge>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetch(`/api/analyses/${a.id}`, { method: "DELETE" })
                          .then(() => setAnalyses(prev => prev.filter(x => x.id !== a.id)));
                      }}
                      className="text-muted-foreground/30 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-500/10"
                      title="Delete analysis"
                    >
                      {"\u2717"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
