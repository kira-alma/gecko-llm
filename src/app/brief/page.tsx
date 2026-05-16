"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface CompetitorEntry {
  name: string;
  price: string;
  note: string;
}

interface CategoryEntry {
  name: string;
  relevance: "primary" | "secondary" | "adjacent";
}

export default function BriefPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Section 1: Product Info
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [targetDemographic, setTargetDemographic] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");

  // Section 2: Competitors
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);
  const [newCompName, setNewCompName] = useState("");
  const [newCompPrice, setNewCompPrice] = useState("");
  const [newCompNote, setNewCompNote] = useState("");
  const [autoFindCompetitors, setAutoFindCompetitors] = useState(false);

  // Section 3: Categories
  const [categories, setCategories] = useState<CategoryEntry[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatRelevance, setNewCatRelevance] = useState<"primary" | "secondary" | "adjacent">("primary");
  const [autoDetectCategories, setAutoDetectCategories] = useState(false);

  // Section 4: Existing Content
  const [existingCopy, setExistingCopy] = useState("");
  const [voiceNotes, setVoiceNotes] = useState("");

  const addFeature = () => {
    if (newFeature.trim()) { setFeatures(f => [...f, newFeature.trim()]); setNewFeature(""); }
  };

  const addCompetitor = () => {
    if (newCompName.trim()) {
      setCompetitors(c => [...c, { name: newCompName.trim(), price: newCompPrice.trim(), note: newCompNote.trim() }]);
      setNewCompName(""); setNewCompPrice(""); setNewCompNote("");
    }
  };

  const addCategory = () => {
    if (newCatName.trim()) {
      setCategories(c => [...c, { name: newCatName.trim(), relevance: newCatRelevance }]);
      setNewCatName("");
    }
  };

  const handleSubmit = async () => {
    if (!productName.trim() || !brand.trim()) return;
    setSubmitting(true);

    try {
      // Create analysis
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: productName.trim() }),
      });
      const analysis = await res.json();

      // Build ProductResearch from form data
      const productResearch = {
        productName: productName.trim(),
        normalizedName: productName.trim(),
        brand: brand.trim(),
        description: description.trim(),
        keyFeatures: features,
        pricing: { msrp: "", typicalRange: priceRange.trim() },
        categories: categories.map(c => ({ name: c.name, relevance: c.relevance, searchTerms: [] })),
        competitors: competitors.map(c => ({
          name: c.name,
          brand: c.name.split(" ")[0],
          priceRange: c.price,
          keyDifferentiator: c.note,
          strengthsVsProduct: [],
          weaknessesVsProduct: [],
        })),
        searchResults: [],
      };

      // Save to analysis — patch with product research + selections
      await fetch(`/api/analyses/${analysis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productResearch,
          competitors: competitors.map(c => c.name),
          selectedCategories: categories.map(c => c.name),
        }),
      });

      // If auto-find competitors is checked, run research for competitors only
      if (autoFindCompetitors || autoDetectCategories) {
        await fetch("/api/pipeline/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisId: analysis.id, mode: "research" }),
        });
      }

      router.push(`/analysis/${analysis.id}`);
    } catch (err) {
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <main className="flex-1 p-8 gecko-bg-mesh">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-muted-foreground mb-4">
            &larr; Back
          </Button>
          <h1 className="text-3xl font-bold gecko-gradient-text">Product Brief</h1>
          <p className="text-muted-foreground mt-1">Fill in your product details. We'll skip web research and use your data directly.</p>
        </div>

        {/* Section 1: Product Info */}
        <div className="gecko-glass rounded-xl p-6 space-y-4" style={{ borderLeft: "3px solid #8b5cf6" }}>
          <h2 className="font-semibold text-violet-400">Product Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Product Name *</label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Nespresso Vertuo Pop+" className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Brand *</label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Nespresso" className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description, positioning statement, or marketing brief..."
              className="mt-1 w-full h-24 rounded-lg bg-card/50 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-violet-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Price Range</label>
              <Input value={priceRange} onChange={(e) => setPriceRange(e.target.value)} placeholder="e.g. $99 - $149" className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Target Demographic</label>
              <Input value={targetDemographic} onChange={(e) => setTargetDemographic(e.target.value)} placeholder="e.g. Young professionals, coffee enthusiasts" className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Key Features</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {features.map((f, i) => (
                <Badge key={i} variant="secondary" className="gap-1 pr-1">
                  {f}
                  <button onClick={() => setFeatures(features.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400 ml-1">{"\u2717"}</button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="Add a feature..." className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }} />
              <Button onClick={addFeature} variant="outline" size="sm" className="h-8">Add</Button>
            </div>
          </div>
        </div>

        {/* Section 2: Competitors */}
        <div className="gecko-glass rounded-xl p-6 space-y-4" style={{ borderLeft: "3px solid #f59e0b" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-amber-400">Competitors</h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={autoFindCompetitors} onChange={(e) => setAutoFindCompetitors(e.target.checked)} className="rounded" />
              Also auto-discover competitors from web
            </label>
          </div>

          {competitors.length > 0 && (
            <div className="space-y-2">
              {competitors.map((c, i) => (
                <div key={i} className="flex items-center gap-3 gecko-glass rounded-lg p-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.price && <span className="text-xs text-muted-foreground ml-2">{c.price}</span>}
                    {c.note && <p className="text-xs text-muted-foreground mt-0.5">{c.note}</p>}
                  </div>
                  <button onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))} className="text-white/30 hover:text-red-400 transition-colors">{"\u2717"}</button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Input value={newCompName} onChange={(e) => setNewCompName(e.target.value)} placeholder="Competitor name *" className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }} />
            <Input value={newCompPrice} onChange={(e) => setNewCompPrice(e.target.value)} placeholder="Price range (optional)" className="h-8 text-sm" />
            <div className="flex gap-1">
              <Input value={newCompNote} onChange={(e) => setNewCompNote(e.target.value)} placeholder="Note (optional)" className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCompetitor(); } }} />
              <Button onClick={addCompetitor} variant="outline" size="sm" className="h-8 shrink-0">Add</Button>
            </div>
          </div>
        </div>

        {/* Section 3: Categories */}
        <div className="gecko-glass rounded-xl p-6 space-y-4" style={{ borderLeft: "3px solid #06b6d4" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-cyan-400">Categories</h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={autoDetectCategories} onChange={(e) => setAutoDetectCategories(e.target.checked)} className="rounded" />
              Also auto-detect categories from web
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((c, i) => (
              <Badge key={i} variant={c.relevance === "primary" ? "default" : "secondary"} className="gap-1 pr-1">
                {c.name} <span className="text-[9px] opacity-60">{c.relevance}</span>
                <button onClick={() => setCategories(categories.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400 ml-1">{"\u2717"}</button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name..." className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} />
            <select value={newCatRelevance} onChange={(e) => setNewCatRelevance(e.target.value as "primary" | "secondary" | "adjacent")}
              className="h-8 rounded-lg bg-card/50 border border-border/50 px-2 text-xs text-foreground">
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="adjacent">Adjacent</option>
            </select>
            <Button onClick={addCategory} variant="outline" size="sm" className="h-8">Add</Button>
          </div>
        </div>

        {/* Section 4: Existing Content */}
        <div className="gecko-glass rounded-xl p-6 space-y-4" style={{ borderLeft: "3px solid #6b7280" }}>
          <h2 className="font-semibold text-muted-foreground">Existing Content <span className="text-xs font-normal">(optional)</span></h2>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Current Marketing Copy / Product Description</label>
            <textarea
              value={existingCopy}
              onChange={(e) => setExistingCopy(e.target.value)}
              placeholder="Paste your current product page copy, bullet points, or any existing marketing materials..."
              className="mt-1 w-full h-24 rounded-lg bg-card/50 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Brand Voice Notes</label>
            <textarea
              value={voiceNotes}
              onChange={(e) => setVoiceNotes(e.target.value)}
              placeholder="How should we talk about this product? (e.g., 'premium but accessible', 'tech-forward', 'family-friendly')..."
              className="mt-1 w-full h-16 rounded-lg bg-card/50 border border-border/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="text-center pb-12">
          <button
            onClick={handleSubmit}
            disabled={!productName.trim() || !brand.trim() || submitting}
            className="px-10 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {submitting ? "Creating analysis..." : "Continue to Retailer Selection"}
          </button>
          <p className="text-[10px] text-muted-foreground mt-2">
            {competitors.length > 0 && !autoFindCompetitors
              ? "Web research will be skipped — using your data directly"
              : "We'll supplement your data with web research"}
          </p>
        </div>
      </div>
    </main>
  );
}
