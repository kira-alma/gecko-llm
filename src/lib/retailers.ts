import type { RetailerDefinition } from "./types";

export const DEFAULT_RETAILERS: RetailerDefinition[] = [
  {
    slug: "amazon",
    name: "Amazon",
    color: "#FF9900",
    domain: "amazon.com",
    pageLayout: `AMAZON PRODUCT PAGE FORMAT:
- Title: [Brand] + [Product Line] + [Key Feature] + [Color/Size], max 200 chars
- Bullets: Exactly 5 bullet points. Each starts with ALL CAPS benefit header.
  Max 500 chars per bullet. Lead with benefit, follow with feature.
- Description: 2000 chars max. Mobile-first (first 200 chars most critical).
  Include brand story, use cases, and compatibility info.
- A+ Content: Modular layout with comparison chart vs competitors,
  lifestyle imagery descriptions, feature callout grids.
- Rating display: Stars + review count prominently shown
- Buy Box: Add to Cart, Buy Now, Prime shipping info
Amazon shoppers scan quickly. Front-load benefits. Use numbers and specs.`,
    voiceNotes:
      "Data-driven, spec-heavy, trust-building through reviews. Prime benefits matter.",
    searchBehavior:
      "Keyword-heavy search. Shoppers use specific product names, comparisons ('vs'), and filter by price/rating. Long-tail queries common.",
  },
  {
    slug: "walmart",
    name: "Walmart",
    color: "#0071DC",
    domain: "walmart.com",
    pageLayout: `WALMART PRODUCT PAGE FORMAT:
- Title: [Brand] [Product Name] [Key Spec] [Color], value-forward
- Description: Value-conscious. Lead with price justification and practicality.
- Key Features: Bulleted, emphasize value, durability, family-friendliness.
- "About this item" section: Practical, specs-heavy, comparison-ready.
- Walmart+ badge and "Pickup today" / "Free shipping" prominently shown
- Price match guarantee messaging
Walmart shoppers prioritize value, reliability, and straightforward information.`,
    voiceNotes:
      "Value-first, practical, family-oriented. Emphasize savings, durability, everyday use.",
    searchBehavior:
      "Price-conscious queries. 'Best [product] under $X', 'cheap [product]', brand + model searches. Pickup/delivery availability matters.",
  },
  {
    slug: "target",
    name: "Target",
    color: "#CC0000",
    domain: "target.com",
    pageLayout: `TARGET PRODUCT PAGE FORMAT:
- Title: Clean, lifestyle-forward. [Brand] [Product Name] - [Finish/Color]
- Description: Lifestyle-focused. Lead with how the product fits into daily life.
  Target shoppers respond to aspirational-but-accessible tone.
- Features: Bulleted, shorter than Amazon. Focus on design and ease of use.
- "About this item" section: Quick-scan friendly, max 6 bullets.
- "Pick it up" / "Same Day Delivery" / "Drive Up" badges
- Clean, image-forward layout with lifestyle photography focus
Target emphasizes design, inclusivity, and everyday joy.
Avoid overly technical language.`,
    voiceNotes:
      "Aspirational yet accessible. Design-forward, lifestyle-oriented. Clean and curated feel.",
    searchBehavior:
      "Brand-aware, lifestyle-oriented queries. 'Best [product] for [use case]', trend-driven searches, aesthetic preferences matter.",
  },
  {
    slug: "costco",
    name: "Costco",
    color: "#E31837",
    domain: "costco.com",
    pageLayout: `COSTCO PRODUCT PAGE FORMAT:
- Title: [Brand] [Product Name] [Key Feature/Bundle Info]
- Description: Bundle/value-focused. Emphasize what's included and member savings.
- Features: Emphasize quantity, included accessories, warranty, member value.
- Simpler layout than Amazon/Walmart. Warehouse aesthetic.
- Member price callout with savings vs retail
- Limited selection = curated quality positioning
Costco shoppers trust Costco's curation. Emphasize the "Costco deal" angle.`,
    voiceNotes:
      "Trust the Costco brand. Value through bundling and member pricing. Quality at scale.",
    searchBehavior:
      "Bundle and deal queries. 'Costco [product] deal', 'Costco member price [product]'. Shoppers often browse rather than search specific models.",
  },
  {
    slug: "bestbuy",
    name: "Best Buy",
    color: "#0046BE",
    domain: "bestbuy.com",
    pageLayout: `BEST BUY PRODUCT PAGE FORMAT:
- Title: [Brand] - [Product Name] - [Key Technical Spec]
- Description: Tech-forward, spec-detailed, but accessible.
- Features & Specifications: Detailed spec table expected and valued.
- Expert Reviews section: Position product in category context.
- Geek Squad protection / Totaltech membership badges
- "Compare" feature prominent — shoppers use it
Best Buy shoppers are typically more tech-literate.
Include comparisons, specifications, and "who this is for" framing.`,
    voiceNotes:
      "Tech-savvy audience. Specification details matter. Expert credibility. Comparison-driven.",
    searchBehavior:
      "Technical, spec-driven queries. 'Best [product] [year]', model number searches, '[product A] vs [product B]' comparisons very common.",
  },
];

export function getRetailerBySlug(slug: string): RetailerDefinition | undefined {
  return DEFAULT_RETAILERS.find((r) => r.slug === slug);
}

export function getRetailerContentConventions(slug: string): string {
  const retailer = getRetailerBySlug(slug);
  if (!retailer) return "";
  return retailer.pageLayout;
}

// Subreddit mapping by product category keywords
export const CATEGORY_SUBREDDIT_MAP: Record<string, string[]> = {
  coffee: ["Coffee", "espresso", "BuyItForLife", "frugal"],
  kitchen: ["Cooking", "BuyItForLife", "homeowners", "KitchenConfidential"],
  electronics: ["gadgets", "BuyItForLife", "technology", "TechDeals"],
  beauty: ["SkincareAddiction", "MakeupAddiction", "beauty"],
  fitness: ["Fitness", "homegym", "running", "BuyItForLife"],
  baby: ["BabyBumps", "beyondthebump", "Parenting", "BuyItForLife"],
  home: ["HomeImprovement", "homeowners", "InteriorDesign", "BuyItForLife"],
  outdoor: ["CampingGear", "hiking", "Outdoors", "BuyItForLife"],
  gaming: ["gaming", "buildapc", "pcgaming", "GameDeals"],
  audio: ["headphones", "audiophile", "BudgetAudiophile"],
  pet: ["dogs", "cats", "Pets", "DogFood"],
  cleaning: ["CleaningTips", "homeowners", "BuyItForLife"],
  general: ["BuyItForLife", "frugal", "GoodValue", "ProductReviews"],
};

export function getRelevantSubreddits(categories: string[]): string[] {
  const subreddits = new Set<string>();
  for (const cat of categories) {
    const lower = cat.toLowerCase();
    for (const [keyword, subs] of Object.entries(CATEGORY_SUBREDDIT_MAP)) {
      if (lower.includes(keyword)) {
        subs.forEach((s) => subreddits.add(s));
      }
    }
  }
  // Always include general-purpose subs
  CATEGORY_SUBREDDIT_MAP.general.forEach((s) => subreddits.add(s));
  return Array.from(subreddits);
}
