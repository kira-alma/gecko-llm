"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import type { CampaignBrief as CampaignBriefType, SocialAdCopy } from "@/lib/types";

const PLATFORM_STYLES: Record<string, { bg: string; icon: string }> = {
  facebook: { bg: "bg-blue-600", icon: "f" },
  instagram: { bg: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400", icon: "IG" },
  tiktok: { bg: "bg-black border border-white/10", icon: "TT" },
  pinterest: { bg: "bg-red-600", icon: "P" },
};

export function CampaignBriefView({ briefs }: { briefs: CampaignBriefType[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-violet-400 text-sm">
          {"\u270E"}
        </div>
        <h3 className="font-semibold">Campaign Briefs</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2 gecko-stagger">
        {briefs.map((brief, i) => (
          <div key={i} className="gecko-glass rounded-xl p-4 space-y-3 hover:bg-muted/10 transition-all">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">{brief.campaignName}</h4>
              <span className="text-[9px] font-mono text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                {brief.targetPersonaId}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Objective</span>
                <p className="text-muted-foreground mt-0.5">{brief.objective}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Key Message</span>
                <p className="mt-0.5">{brief.keyMessage}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-semibold text-[10px]">CTA:</span>
                <span className="text-xs">{brief.callToAction}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(brief.channels ?? []).map((ch) => (
                  <span key={ch} className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded">
                    {ch}
                  </span>
                ))}
              </div>
            </div>
            <div className="pt-2 border-t border-border/20 text-[10px] text-muted-foreground/70 italic">
              <span className="text-emerald-400/70 not-italic font-medium">Why: </span>
              {brief.reasoning}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SocialAdCopyView({ ads }: { ads: SocialAdCopy[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400 text-sm">
          {"\u2605"}
        </div>
        <h3 className="font-semibold">Social Ad Copy</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 gecko-stagger">
        {ads.map((ad, i) => (
          <SocialAdCard key={i} ad={ad} />
        ))}
      </div>
    </div>
  );
}

function SocialAdCard({ ad }: { ad: SocialAdCopy }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const platform = PLATFORM_STYLES[ad.platform] ?? { bg: "bg-gray-600", icon: "?" };

  return (
    <div className="gecko-glass rounded-xl overflow-hidden hover:bg-muted/10 transition-all">
      {/* Platform header */}
      <div className={`${platform.bg} px-3 py-1.5 flex items-center justify-between`}>
        <span className="text-white text-[10px] font-bold uppercase tracking-wider">{ad.platform}</span>
        <span className="text-white/60 text-[9px]">{ad.format}</span>
      </div>

      <div className="p-4 space-y-2.5">
        <p className="font-bold text-sm">{ad.headline}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{ad.primaryText}</p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            {ad.callToAction}
          </span>
          <span className="text-[9px] font-mono text-muted-foreground">{ad.targetPersonaId}</span>
        </div>

        {ad.hashtags?.length > 0 && (
          <p className="text-[10px] text-blue-400/60">{ad.hashtags.join(" ")}</p>
        )}

        <div className="text-[10px] text-muted-foreground/60 italic">
          <span className="font-medium not-italic">Creative:</span> {ad.imageDirection}
        </div>

        <Collapsible open={showReasoning} onOpenChange={setShowReasoning}>
          <CollapsibleTrigger className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1">
            <span>{showReasoning ? "\u25BC" : "\u25B6"}</span>
            Reasoning
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1.5 text-[10px] text-muted-foreground/60 italic leading-relaxed">
            {ad.reasoning}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
