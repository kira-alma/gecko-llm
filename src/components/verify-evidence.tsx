"use client";

import { useState } from "react";

export function VerifyButton({
  label,
  items,
  type = "quotes",
}: {
  label?: string | null;
  items: { text: string; source?: string; url?: string }[];
  type?: "quotes" | "queries" | "listing";
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [showCount, setShowCount] = useState(20);

  if (items.length === 0) return null;

  const filtered = filter
    ? items.filter(item => item.text.toLowerCase().includes(filter.toLowerCase()))
    : items;
  const displayed = filtered.slice(0, showCount);
  const remaining = filtered.length - displayed.length;

  return (
    <div>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); setShowCount(20); setFilter(""); }}
        className="text-[9px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
      >
        <span className="w-3 h-3 rounded-full border border-blue-400/40 flex items-center justify-center text-[7px]">
          {open ? "\u2212" : "\u2713"}
        </span>
        {label ?? "show evidence"}
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border border-blue-500/10 bg-blue-500/5 overflow-hidden">
          {/* Header with count + filter */}
          <div className="px-2 py-1.5 border-b border-blue-500/10 flex items-center gap-2">
            <span className="text-[9px] text-blue-400/60 shrink-0">
              {filtered.length === items.length
                ? `${items.length} items`
                : `${filtered.length} of ${items.length}`}
            </span>
            {items.length > 10 && (
              <input
                type="text"
                placeholder="Filter..."
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setShowCount(20); }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-[9px] bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/30 min-w-0"
              />
            )}
          </div>

          {/* Items — plain div with max height, no ScrollArea */}
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {displayed.map((item, i) => (
              <div key={i} className="text-[10px] flex items-start gap-1.5 py-0.5">
                {type === "quotes" && (
                  <>
                    <span className="text-blue-400/50 shrink-0 mt-0.5">{"\u201C"}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground italic">{item.text}</span>
                      {item.source && (
                        <span className="text-[8px] text-muted-foreground/40 ml-1">— {item.source}</span>
                      )}
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-1 text-[8px]">
                          source
                        </a>
                      )}
                    </div>
                  </>
                )}
                {type === "queries" && (
                  <>
                    <span className="text-blue-400/50 shrink-0">{"\u2022"}</span>
                    <code className="text-muted-foreground text-[9px]">{item.text}</code>
                  </>
                )}
                {type === "listing" && (
                  <pre className="text-[9px] text-muted-foreground whitespace-pre-wrap break-words w-full">{item.text}</pre>
                )}
              </div>
            ))}
          </div>

          {/* Show more — OUTSIDE the scroll area */}
          {remaining > 0 && (
            <div className="px-2 py-2 border-t border-blue-500/10">
              <button
                onClick={(e) => { e.stopPropagation(); setShowCount(s => s + 40); }}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
              >
                Show {Math.min(40, remaining)} more ({remaining} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
