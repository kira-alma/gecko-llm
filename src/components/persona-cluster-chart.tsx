"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import type { ShopperPersona } from "@/lib/types";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4"];

// Derive numeric scores from persona data for the heatmap/radar
interface PersonaScores {
  priceSensitivity: number;
  brandLoyalty: number;
  techSavviness: number;
  convenienceNeed: number;
  researchIntensity: number;
  socialInfluence: number;
}

const ATTRIBUTES = [
  { key: "priceSensitivity", label: "Price Sensitivity", short: "Price" },
  { key: "brandLoyalty", label: "Brand Loyalty", short: "Brand" },
  { key: "techSavviness", label: "Tech Savviness", short: "Tech" },
  { key: "convenienceNeed", label: "Convenience Need", short: "Convenience" },
  { key: "researchIntensity", label: "Research Intensity", short: "Research" },
  { key: "socialInfluence", label: "Social Influence", short: "Social" },
];

function deriveScores(p: ShopperPersona): PersonaScores {
  const vals = p.psychographics.values.map(v => v.toLowerCase()).join(" ");
  const pains = p.psychographics.painPoints.map(v => v.toLowerCase()).join(" ");
  const triggers = p.shoppingBehavior.purchaseTriggers.map(v => v.toLowerCase()).join(" ");
  const style = p.psychographics.decisionStyle.toLowerCase();
  const priceQ = p.clusterCoordinates.priceVsQuality;

  return {
    priceSensitivity: Math.max(0.1, Math.min(1, 0.5 - priceQ * 0.45 +
      (vals.includes("budget") || vals.includes("value") || vals.includes("price") || vals.includes("saving") || pains.includes("expensive") ? 0.2 : 0) +
      (vals.includes("premium") || vals.includes("luxury") ? -0.15 : 0))),
    brandLoyalty: Math.max(0.1, Math.min(1, 0.4 +
      (vals.includes("brand") || vals.includes("trust") || vals.includes("loyal") || triggers.includes("brand") ? 0.35 : 0) +
      (vals.includes("open") || vals.includes("try") || style.includes("deal") ? -0.15 : 0))),
    techSavviness: Math.max(0.1, Math.min(1,
      p.demographics.techSavviness?.toLowerCase() === "high" ? 0.85 :
      p.demographics.techSavviness?.toLowerCase() === "medium" ? 0.5 :
      p.demographics.techSavviness?.toLowerCase() === "low" ? 0.2 : 0.5)),
    convenienceNeed: Math.max(0.1, Math.min(1, 0.5 - p.clusterCoordinates.convenienceVsControl * 0.4 +
      (vals.includes("convenience") || vals.includes("easy") || vals.includes("simple") || vals.includes("quick") ? 0.2 : 0))),
    researchIntensity: Math.max(0.1, Math.min(1,
      style === "research-heavy" ? 0.9 :
      style === "social-proof" ? 0.6 :
      style === "deal-driven" ? 0.45 :
      style === "impulse" ? 0.15 : 0.5)),
    socialInfluence: Math.max(0.1, Math.min(1, 0.4 +
      (style === "social-proof" ? 0.4 : 0) +
      (triggers.includes("review") || triggers.includes("recommend") || triggers.includes("rating") ? 0.2 : 0) +
      (style === "research-heavy" ? -0.1 : 0))),
  };
}

export function PersonaClusterChart({
  personas,
  selectedPersonaId,
  onPersonaClick,
}: {
  personas: ShopperPersona[];
  selectedPersonaId?: string | null;
  onPersonaClick?: (personaId: string) => void;
}) {
  const [radarActive, setRadarActive] = useState<Set<string>>(
    new Set(personas.map(p => p.id))
  );
  const [sortAttr, setSortAttr] = useState<string | null>(null);

  const scored = personas.map((p, i) => ({
    persona: p,
    scores: deriveScores(p),
    color: COLORS[i % COLORS.length],
    pct: Math.round(p.clusterCoordinates.estimatedSegmentSize * 100),
  }));

  // Sort heatmap rows
  const sorted = sortAttr
    ? [...scored].sort((a, b) => (b.scores as unknown as Record<string, number>)[sortAttr] - (a.scores as unknown as Record<string, number>)[sortAttr])
    : [...scored].sort((a, b) => b.pct - a.pct);

  const toggleRadar = (id: string) => {
    setRadarActive(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Segment Bars */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Segment Share</p>
        <div className="space-y-1.5">
          {sorted.map(({ persona, pct, color }) => (
            <div
              key={persona.id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                selectedPersonaId === persona.id ? "gecko-glass-accent" : "hover:bg-muted/10"
              }`}
              onClick={() => onPersonaClick?.(persona.id)}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold truncate">{persona.archetypeName}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color, minWidth: "8px" }}
                  />
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleRadar(persona.id); }}
                className={`w-5 h-5 rounded border text-[9px] font-bold shrink-0 transition-all ${
                  radarActive.has(persona.id)
                    ? "border-current text-foreground"
                    : "border-muted-foreground/30 text-muted-foreground/30"
                }`}
                title={radarActive.has(persona.id) ? "Hide from radar" : "Show on radar"}
              >
                {radarActive.has(persona.id) ? "\u2713" : ""}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Radar Chart */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Persona Comparison</p>
        <RadarChart
          personas={scored.filter(s => radarActive.has(s.persona.id))}
          selectedId={selectedPersonaId}
        />
      </div>

      {/* Section 3: Attribute Heatmap */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Attribute Matrix</p>
        <div className="gecko-glass rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid gap-px" style={{ gridTemplateColumns: `140px repeat(${ATTRIBUTES.length}, 1fr)` }}>
            <div className="p-2 text-[9px] text-muted-foreground" />
            {ATTRIBUTES.map(attr => (
              <button
                key={attr.key}
                onClick={() => setSortAttr(sortAttr === attr.key ? null : attr.key)}
                className={`p-2 text-[9px] uppercase tracking-wider text-center font-semibold transition-colors ${
                  sortAttr === attr.key ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {attr.short}
                {sortAttr === attr.key && " \u2193"}
              </button>
            ))}
          </div>
          {/* Rows */}
          {sorted.map(({ persona, scores, color }) => (
            <div
              key={persona.id}
              className={`grid gap-px cursor-pointer transition-all ${
                selectedPersonaId === persona.id ? "bg-emerald-500/5" : "hover:bg-muted/5"
              }`}
              style={{ gridTemplateColumns: `140px repeat(${ATTRIBUTES.length}, 1fr)` }}
              onClick={() => onPersonaClick?.(persona.id)}
            >
              <div className="p-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-medium truncate">{persona.archetypeName}</span>
              </div>
              {ATTRIBUTES.map(attr => {
                const val = (scores as unknown as Record<string, number>)[attr.key];
                return (
                  <div key={attr.key} className="p-2 flex items-center justify-center">
                    <HeatCell value={val} color={color} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground/50 italic">Click column headers to sort. Scores derived from persona psychographics, demographics, and behavioral data.</p>
      </div>
    </div>
  );
}

// Heat cell — visual intensity indicator
function HeatCell({ value, color }: { value: number; color: string }) {
  // Convert 0-1 to opacity
  const opacity = 0.15 + value * 0.7;
  const barWidth = Math.max(8, value * 100);
  return (
    <div className="w-full h-5 rounded bg-muted/10 overflow-hidden relative flex items-center">
      <div
        className="h-full rounded transition-all duration-500"
        style={{ width: `${barWidth}%`, backgroundColor: color, opacity }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/80">
        {Math.round(value * 10)}/10
      </span>
    </div>
  );
}

// Radar/Spider chart drawn on canvas
function RadarChart({
  personas,
  selectedId,
}: {
  personas: { persona: ShopperPersona; scores: PersonaScores; color: string }[];
  selectedId?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 280;
  const center = size / 2;
  const maxR = size / 2 - 40;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const attrs = ATTRIBUTES;
    const angleStep = (Math.PI * 2) / attrs.length;

    // Draw concentric rings
    for (let ring = 1; ring <= 4; ring++) {
      const r = (maxR * ring) / 4;
      ctx.strokeStyle = `rgba(255,255,255,${ring === 4 ? 0.08 : 0.04})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= attrs.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw axis lines and labels
    for (let i = 0; i < attrs.length; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const x = center + Math.cos(angle) * maxR;
      const y = center + Math.sin(angle) * maxR;

      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Label
      const labelR = maxR + 18;
      const lx = center + Math.cos(angle) * labelR;
      const ly = center + Math.sin(angle) * labelR;
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(attrs[i].short, lx, ly);
    }

    // Draw persona polygons (non-selected first, then selected on top)
    const sortedPersonas = [...personas].sort((a, b) => {
      if (a.persona.id === selectedId) return 1;
      if (b.persona.id === selectedId) return -1;
      return 0;
    });

    for (const { persona, scores, color } of sortedPersonas) {
      const isSelected = persona.id === selectedId;
      const values = attrs.map(a => (scores as unknown as Record<string, number>)[a.key]);

      // Fill
      ctx.fillStyle = color + (isSelected ? "30" : "15");
      ctx.strokeStyle = color + (isSelected ? "cc" : "66");
      ctx.lineWidth = isSelected ? 2.5 : 1.5;

      ctx.beginPath();
      for (let i = 0; i < values.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const r = values[i] * maxR;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw dots at vertices
      for (let i = 0; i < values.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const r = values[i] * maxR;
        const x = center + Math.cos(angle) * r;
        const y = center + Math.sin(angle) * r;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, isSelected ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [personas, selectedId, center, maxR, size]);

  useEffect(() => {
    draw();
  }, [draw]);

  if (personas.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
        Toggle personas on to compare
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="gecko-chart-glow"
      />
    </div>
  );
}
