import type { RetailerInsights, ContentReadinessScore } from "./types";

/**
 * Check if content text contains keywords from a phrase.
 * Requires at least one keyword of 5+ chars to match.
 */
function contentCovers(contentText: string, phrase: string): boolean {
  if (!contentText) return false;
  const words = phrase.toLowerCase().split(/\s+/).filter(w => w.length >= 5);
  if (words.length === 0) return false;
  // Require at least one long word match
  return words.some(w => contentText.includes(w));
}

/**
 * Calculate Content Readiness Score.
 * All 5 categories measure: "does the content cover this?"
 * Pass contentText = real listing for "before", mock page for "after".
 */
export function calculateReadinessScore(
  insights: RetailerInsights,
  contentText?: string
): ContentReadinessScore {
  const categories: ContentReadinessScore["categories"] = [];
  const ct = (contentText ?? "").toLowerCase();

  // === 1. Pain Point Coverage (25pts) ===
  // Does the content address each pain point?
  const painPoints = insights.painPointFixes ?? [];
  const ppTotal = painPoints.length || 1;
  const ppItems = painPoints.map(p => {
    const covered = ct ? contentCovers(ct, p.painPoint) || contentCovers(ct, p.contentFix) : p.currentCoverage === "covered";
    return { label: p.painPoint, status: (covered ? "pass" : "fail") as "pass" | "fail" };
  });
  const ppCovered = ppItems.filter(i => i.status === "pass").length;
  const ppScore = Math.round((ppCovered / ppTotal) * 25);
  categories.push({
    category: "Pain Point Coverage",
    score: ppScore,
    maxScore: 25,
    items: ppItems,
    status: ppScore >= 20 ? "strong" : ppScore >= 12 ? "adequate" : ppScore >= 5 ? "weak" : "missing",
  });

  // === 2. Keyword Coverage (25pts) ===
  // Does the content include each keyword?
  const keywords = insights.keywordGaps ?? [];
  const kwTotal = keywords.length || 1;
  const kwItems = keywords
    .sort((a, b) => {
      const pri = { critical: 0, high: 1, medium: 2 };
      return (pri[a.priority] ?? 3) - (pri[b.priority] ?? 3);
    })
    .slice(0, 20)
    .map(k => {
      const present = ct ? contentCovers(ct, k.keyword) : k.currentPresence !== "missing";
      return { label: `"${k.keyword}" (${k.priority})`, status: (present ? "pass" : "fail") as "pass" | "fail" };
    });
  const kwPresent = kwItems.filter(i => i.status === "pass").length;
  const kwScore = Math.round((kwPresent / Math.max(kwItems.length, 1)) * 25);
  categories.push({
    category: "Keyword Coverage",
    score: kwScore,
    maxScore: 25,
    items: kwItems,
    status: kwScore >= 20 ? "strong" : kwScore >= 12 ? "adequate" : kwScore >= 5 ? "weak" : "missing",
  });

  // === 3. Handling Shopper Concerns (20pts) ===
  // Does the content address each objection's rebuttal?
  const objections = insights.objectionMap ?? [];
  const objTotal = objections.length || 1;
  const objItems = objections.map(o => {
    const addressed = ct ? contentCovers(ct, o.rebuttal) || contentCovers(ct, o.objection) : false;
    return { label: `${o.objection} (${o.severity})`, status: (addressed ? "pass" : "fail") as "pass" | "fail" };
  });
  const objAddressed = objItems.filter(i => i.status === "pass").length;
  const objScore = Math.round((objAddressed / objTotal) * 20);
  categories.push({
    category: "Handling Shopper Concerns",
    score: objScore,
    maxScore: 20,
    items: objItems,
    status: objScore >= 16 ? "strong" : objScore >= 10 ? "adequate" : objScore >= 4 ? "weak" : "missing",
  });

  // === 4. Standing Out vs Competitors (15pts) ===
  // Does the content mention USPs and address competitor gaps?
  const compGaps = insights.competitorContentGaps ?? [];
  const usps = insights.competitivePositioning.uniqueSellingPoints;
  const vulns = insights.competitivePositioning.vulnerabilities;
  const compItems = [
    ...usps.map(u => {
      const mentioned = ct ? contentCovers(ct, u) : false;
      return { label: `Strength: ${u}`, status: (mentioned ? "pass" : "fail") as "pass" | "fail" };
    }),
    ...compGaps.map(g => {
      const addressed = ct ? contentCovers(ct, g.fixAction) || contentCovers(ct, g.ourGap) : false;
      return { label: `Gap vs ${g.competitorName}: ${g.ourGap}`, status: (addressed ? "pass" : "fail") as "pass" | "fail" };
    }),
    ...vulns.map(v => {
      const countered = ct ? contentCovers(ct, v) : false;
      return { label: `Vulnerability: ${v}`, status: (countered ? "pass" : "fail") as "pass" | "fail" };
    }),
  ];
  const compTotal = compItems.length || 1;
  const compAddressed = compItems.filter(i => i.status === "pass").length;
  const compScore = Math.round((compAddressed / compTotal) * 15);
  categories.push({
    category: "Standing Out vs Competitors",
    score: compScore,
    maxScore: 15,
    items: compItems,
    status: compScore >= 12 ? "strong" : compScore >= 7 ? "adequate" : compScore >= 3 ? "weak" : "missing",
  });

  // === 5. Reaching All Shopper Types (15pts) ===
  // Does the content contain keywords relevant to each persona?
  const allPersonaRefs = new Set<string>();
  for (const pp of painPoints) for (const p of pp.personaIds) allPersonaRefs.add(p);
  for (const a of insights.messagingAngles ?? []) for (const p of a.targetPersonas) allPersonaRefs.add(p);
  for (const r of insights.recommendations ?? []) for (const p of r.personaAlignment) allPersonaRefs.add(p);

  // For each persona, check if any of their associated pain points or messaging angles are in the content
  const personaItems = Array.from(allPersonaRefs).map(pid => {
    if (!ct) {
      // No content — check if persona has messaging angles
      const hasAngle = (insights.messagingAngles ?? []).some(a => a.targetPersonas.includes(pid));
      return { label: pid, status: (hasAngle ? "pass" : "fail") as "pass" | "fail" };
    }
    // Check if content covers any pain point or keyword associated with this persona
    const personaPainPoints = painPoints.filter(pp => pp.personaIds.includes(pid));
    const personaKeywords = keywords.filter(k => (k.personaIds ?? []).includes(pid));
    const covered = personaPainPoints.some(pp => contentCovers(ct, pp.painPoint) || contentCovers(ct, pp.contentFix))
      || personaKeywords.some(k => contentCovers(ct, k.keyword));
    return { label: pid, status: (covered ? "pass" : "fail") as "pass" | "fail" };
  });
  const personaTotal = personaItems.length || 1;
  const personaCovered = personaItems.filter(i => i.status === "pass").length;
  const personaScore = Math.round((personaCovered / personaTotal) * 15);
  categories.push({
    category: "Reaching All Shopper Types",
    score: personaScore,
    maxScore: 15,
    items: personaItems,
    status: personaScore >= 12 ? "strong" : personaScore >= 8 ? "adequate" : personaScore >= 4 ? "weak" : "missing",
  });

  // === Overall ===
  const overallScore = categories.reduce((sum, c) => sum + c.score, 0);

  return { overallScore, categories };
}
