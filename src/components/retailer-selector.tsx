"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_RETAILERS } from "@/lib/retailers";

const RETAILER_ICONS: Record<string, string> = {
  amazon: "A",
  walmart: "W",
  target: "T",
  costco: "C",
  bestbuy: "BB",
};

export function RetailerSelector({
  onLaunch,
}: {
  onLaunch: (retailers: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["amazon", "walmart", "target"])
  );
  const [customName, setCustomName] = useState("");
  const [customRetailers, setCustomRetailers] = useState<
    { slug: string; name: string }[]
  >([]);

  const toggle = (slug: string) => {
    const next = new Set(selected);
    if (next.has(slug)) {
      next.delete(slug);
    } else {
      next.add(slug);
    }
    setSelected(next);
  };

  const addCustom = () => {
    if (customName.trim()) {
      const slug = `custom_${customName.trim().toLowerCase().replace(/\s+/g, "_")}`;
      if (!selected.has(slug)) {
        setCustomRetailers((prev) => [
          ...prev,
          { slug, name: customName.trim() },
        ]);
        setSelected((prev) => new Set([...prev, slug]));
        setCustomName("");
      }
    }
  };

  const allRetailers = [
    ...DEFAULT_RETAILERS.map((r) => ({ slug: r.slug, name: r.name, color: r.color })),
    ...customRetailers.map((r) => ({ slug: r.slug, name: r.name, color: "#6B7280" })),
  ];

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold">Select Retailers</h2>
        <p className="text-muted-foreground">
          Choose which retailers to analyze. Each retailer gets its own persona
          analysis and content strategy.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {allRetailers.map((r) => {
          const isSelected = selected.has(r.slug);
          return (
            <Card
              key={r.slug}
              className={`cursor-pointer transition-all ${
                isSelected
                  ? "ring-2 ring-emerald-500 bg-emerald-500/10"
                  : "hover:bg-accent"
              }`}
              onClick={() => toggle(r.slug)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                  style={{ backgroundColor: r.color }}
                >
                  {RETAILER_ICONS[r.slug] || r.name[0]}
                </div>
                <span className="font-medium">{r.name}</span>
                {isSelected && (
                  <span className="ml-auto text-emerald-500">{"\u2713"}</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add custom retailer..."
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          className="h-10"
        />
        <Button onClick={addCustom} variant="outline" className="h-10">
          Add
        </Button>
      </div>

      <Button
        onClick={() => onLaunch(Array.from(selected))}
        disabled={selected.size === 0}
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-base"
      >
        Launch Analysis ({selected.size} retailer
        {selected.size !== 1 ? "s" : ""})
      </Button>
    </div>
  );
}
