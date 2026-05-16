"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

export function ProductInput({
  onSubmit,
  isLoading,
}: {
  onSubmit: (productName: string) => void;
  isLoading: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      className="w-full max-w-xl mx-auto"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
    >
      <div className="relative">
        <Input
          placeholder='e.g. "Nespresso Vertuo Pop+ Coffee and Espresso Maker"'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-14 text-base pl-5 pr-28 rounded-xl bg-card/50 border-border/50 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all"
          autoFocus
        />
        <button
          type="submit"
          disabled={!value.trim() || isLoading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing
            </span>
          ) : (
            "Analyze"
          )}
        </button>
      </div>
    </form>
  );
}
