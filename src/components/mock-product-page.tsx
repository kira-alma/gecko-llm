"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { MockProductPage as MockProductPageType } from "@/lib/types";

const RETAILER_THEMES: Record<string, {
  accent: string;
  btnBg: string;
  btnText: string;
  headerBg: string;
  headerText: string;
  priceFg: string;
  urlText: string;
}> = {
  amazon: {
    accent: "#FF9900",
    btnBg: "#FFD814",
    btnText: "#0F1111",
    headerBg: "#131921",
    headerText: "#FFFFFF",
    priceFg: "#B12704",
    urlText: "amazon.com",
  },
  walmart: {
    accent: "#0071DC",
    btnBg: "#0071DC",
    btnText: "#FFFFFF",
    headerBg: "#0071DC",
    headerText: "#FFFFFF",
    priceFg: "#2E2F32",
    urlText: "walmart.com",
  },
  target: {
    accent: "#CC0000",
    btnBg: "#CC0000",
    btnText: "#FFFFFF",
    headerBg: "#CC0000",
    headerText: "#FFFFFF",
    priceFg: "#333333",
    urlText: "target.com",
  },
  costco: {
    accent: "#E31837",
    btnBg: "#005DAA",
    btnText: "#FFFFFF",
    headerBg: "#003B64",
    headerText: "#FFFFFF",
    priceFg: "#E31837",
    urlText: "costco.com",
  },
  bestbuy: {
    accent: "#0046BE",
    btnBg: "#FFE000",
    btnText: "#1D252C",
    headerBg: "#0046BE",
    headerText: "#FFFFFF",
    priceFg: "#1D252C",
    urlText: "bestbuy.com",
  },
};

export function MockProductPageView({
  page,
  retailerSlug,
}: {
  page: MockProductPageType;
  retailerSlug: string;
}) {
  const theme = RETAILER_THEMES[retailerSlug] ?? RETAILER_THEMES.amazon;
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);

  const getAnnotation = (sectionId: string) =>
    page.annotations.find((a) => a.sectionId === sectionId);

  const AnnotationDot = ({ sectionId, index }: { sectionId: string; index: number }) => {
    const annotation = getAnnotation(sectionId);
    if (!annotation) return null;
    const isActive = activeAnnotation === sectionId;
    return (
      <button
        onClick={() => setActiveAnnotation(isActive ? null : sectionId)}
        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold ml-2 transition-all ${
          isActive
            ? "bg-emerald-500 text-white scale-125 shadow-lg shadow-emerald-500/30"
            : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40"
        }`}
      >
        {index}
      </button>
    );
  };

  return (
    <div className="flex gap-5">
      {/* Browser frame mock */}
      <div className="flex-1 gecko-browser-frame">
        {/* Browser chrome */}
        <div className="bg-[#2a2a2e] px-3 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 ml-3 bg-[#1c1c1e] rounded-md px-3 py-1 text-[11px] text-gray-400 font-mono">
            {theme.urlText}/dp/product
          </div>
        </div>

        {/* Retailer header bar */}
        <div style={{ backgroundColor: theme.headerBg }} className="px-4 py-2 flex items-center gap-3">
          <span className="font-bold text-sm" style={{ color: theme.headerText }}>
            {retailerSlug.charAt(0).toUpperCase() + retailerSlug.slice(1)}
          </span>
          <div className="flex-1 bg-white/10 rounded px-2 py-0.5 text-[10px] text-white/50">
            Search
          </div>
        </div>

        {/* Product page content */}
        <div className="bg-white p-6 text-[#0F1111] space-y-4">
          {/* Title */}
          <div>
            <h2 className="text-[15px] font-medium leading-snug text-[#0F1111]">
              {page.title}
              <AnnotationDot sectionId="title" index={1} />
            </h2>
            {page.subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{page.subtitle}</p>
            )}
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-amber-500">
              {"★".repeat(Math.floor(page.rating.stars))}
              {page.rating.stars % 1 >= 0.5 ? "½" : ""}
            </span>
            <span className="text-xs text-blue-600 hover:underline cursor-default">
              {page.rating.count}
            </span>
          </div>

          {/* Price */}
          <div className="text-2xl font-bold" style={{ color: theme.priceFg }}>
            {page.price}
          </div>

          {/* Bullets */}
          <div>
            <ul className="space-y-1.5 text-[13px] text-[#333]">
              {page.bullets.map((b, i) => (
                <li key={i} className="flex gap-2 leading-snug">
                  <span className="text-gray-400 shrink-0 mt-0.5">{"\u2022"}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <AnnotationDot sectionId="bullets" index={2} />
          </div>

          {/* CTA button */}
          <button
            className="w-full py-2.5 rounded-full font-medium text-sm"
            style={{ backgroundColor: theme.btnBg, color: theme.btnText }}
          >
            Add to Cart
          </button>

          {/* Description */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-sm text-[#0F1111] mb-2">
              About this item
              <AnnotationDot sectionId="description" index={3} />
            </h3>
            <p className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line">
              {page.description}
            </p>
          </div>

          {/* Comparison Table */}
          {page.comparisonTable && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-sm text-[#0F1111] mb-3">Compare with similar items</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      {page.comparisonTable.headers.map((h, i) => (
                        <th key={i} className="p-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.comparisonTable.rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                        <td className="p-2.5 border-b border-gray-100 font-medium text-gray-700">{row.product}</td>
                        {row.values.map((v, j) => (
                          <td key={j} className="p-2.5 border-b border-gray-100 text-gray-600">{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Enhanced Content */}
          {page.enhancedContent && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-sm text-[#0F1111] mb-2">
                From the brand
                <AnnotationDot sectionId="enhanced" index={4} />
              </h3>
              <div
                className="text-[13px] text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: page.enhancedContent }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Annotations panel */}
      <div className="w-72 shrink-0 space-y-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="text-emerald-400">{"\u25CF"}</span>
            Why These Choices
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
            {page.designNotes}
          </p>
        </div>
        <div className="space-y-2 gecko-stagger">
          {page.annotations.map((a, i) => (
            <Collapsible
              key={a.sectionId}
              open={activeAnnotation === a.sectionId}
              onOpenChange={(open) => setActiveAnnotation(open ? a.sectionId : null)}
            >
              <CollapsibleTrigger className="w-full text-left">
                <div
                  className={`rounded-lg p-3 flex items-center gap-2 text-sm transition-all cursor-pointer ${
                    activeAnnotation === a.sectionId
                      ? "gecko-glass-accent gecko-glow-sm"
                      : "gecko-glass hover:bg-muted/20"
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                    activeAnnotation === a.sectionId
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="font-medium text-xs">{a.sectionName}</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 pt-2 text-[11px] space-y-2">
                  <p className="text-muted-foreground leading-relaxed">{a.reasoning}</p>
                  <div className="flex flex-wrap gap-1">
                    {a.personaTarget.map((p) => (
                      <Badge key={p} variant="secondary" className="text-[8px] px-1.5 py-0">
                        {p}
                      </Badge>
                    ))}
                  </div>
                  {a.sourceInsights.length > 0 && (
                    <p className="text-emerald-400/70 text-[10px]">
                      Based on: {a.sourceInsights.join("; ")}
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </div>
  );
}
