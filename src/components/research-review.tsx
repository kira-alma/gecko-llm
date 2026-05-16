"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductResearch } from "@/lib/types";

export function ResearchReview({
  research,
  competitors,
  selectedCategories,
  onCompetitorsChange,
  onCategoriesChange,
  onConfirm,
}: {
  research: ProductResearch;
  competitors: string[];
  selectedCategories: string[];
  onCompetitorsChange: (competitors: string[]) => void;
  onCategoriesChange: (categories: string[]) => void;
  onConfirm: () => void;
}) {
  const [newCompetitor, setNewCompetitor] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const addCompetitor = () => {
    if (newCompetitor.trim() && !competitors.includes(newCompetitor.trim())) {
      onCompetitorsChange([...competitors, newCompetitor.trim()]);
      setNewCompetitor("");
    }
  };

  const removeCompetitor = (name: string) => {
    onCompetitorsChange(competitors.filter((c) => c !== name));
  };

  const toggleCategory = (name: string) => {
    if (selectedCategories.includes(name)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== name));
    } else {
      onCategoriesChange([...selectedCategories, name]);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold">Product Research Complete</h2>
        <p className="text-muted-foreground">
          Select categories to analyze, review competitors, then proceed
        </p>
      </div>

      {/* Product Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{research.normalizedName || research.productName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Brand:</span>{" "}
              <span className="font-medium">{research.brand}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Price:</span>{" "}
              <span className="font-medium">{research.pricing?.typicalRange || research.pricing?.msrp || "N/A"}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{research.description}</p>
          <div>
            <p className="text-sm font-medium mb-2">Key Features</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {research.keyFeatures?.slice(0, 6).map((f, i) => (
                <li key={i}>- {f}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Categories — selectable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Categories ({selectedCategories.length} selected)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Select which categories to analyze. Personas and insights will focus on shoppers in these categories.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {research.categories?.map((cat) => {
              const isSelected = selectedCategories.includes(cat.name);
              return (
                <button
                  key={cat.name}
                  onClick={() => toggleCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    isSelected
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                      : "bg-muted/20 text-muted-foreground border-border/50 hover:bg-muted/40"
                  }`}
                >
                  {isSelected && "\u2713 "}
                  {cat.name}
                  <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                    {cat.relevance}
                  </span>
                </button>
              );
            })}
            {/* Custom categories not in research results */}
            {selectedCategories
              .filter(c => !research.categories?.some(rc => rc.name === c))
              .map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all border bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                >
                  {"\u2713 "}{cat}
                  <span className="ml-1.5 text-[10px] text-muted-foreground/60">custom</span>
                </button>
              ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Input
              placeholder="Add custom category..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (newCategory.trim() && !selectedCategories.includes(newCategory.trim())) {
                    onCategoriesChange([...selectedCategories, newCategory.trim()]);
                    setNewCategory("");
                  }
                }
              }}
              className="h-9"
            />
            <Button
              onClick={() => {
                if (newCategory.trim() && !selectedCategories.includes(newCategory.trim())) {
                  onCategoriesChange([...selectedCategories, newCategory.trim()]);
                  setNewCategory("");
                }
              }}
              variant="outline"
              size="sm"
              className="h-9"
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Competitors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Competitors ({competitors.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {competitors.map((name) => (
              <Badge
                key={name}
                variant="outline"
                className="pl-3 pr-1 py-1.5 gap-1"
              >
                {name}
                <button
                  onClick={() => removeCompetitor(name)}
                  className="ml-1 hover:text-destructive rounded-full p-0.5"
                >
                  x
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a competitor..."
              value={newCompetitor}
              onChange={(e) => setNewCompetitor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCompetitor();
                }
              }}
              className="h-9"
            />
            <Button
              onClick={addCompetitor}
              variant="outline"
              size="sm"
              className="h-9"
            >
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={onConfirm}
        disabled={selectedCategories.length === 0}
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-base"
      >
        {selectedCategories.length === 0
          ? "Select at least one category to continue"
          : `Continue with ${selectedCategories.length} categor${selectedCategories.length === 1 ? "y" : "ies"}`}
      </Button>
    </div>
  );
}
