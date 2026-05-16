// ============================================
// GeckoLLM Type Definitions
// ============================================

// === Analysis Status ===
export type AnalysisStatus =
  | "pending"
  | "researching"
  | "generating_personas"
  | "generating_insights"
  | "generating_content"
  | "completed"
  | "failed";

export type RetailerResultStatus =
  | "pending"
  | "generating_personas"
  | "generating_insights"
  | "generating_content"
  | "completed"
  | "failed";

// === Core Analysis ===
export interface Analysis {
  id: string;
  productName: string;
  status: AnalysisStatus;
  currentStage: string | null;
  currentStageProgress: number;
  productResearch: ProductResearch | null;
  competitors: string[];
  selectedCategories: string[];
  selectedRetailers: string[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// === Stage 1: Product Research ===
export interface ProductResearch {
  productName: string;
  normalizedName: string;
  brand: string;
  description: string;
  keyFeatures: string[];
  pricing: {
    msrp: string;
    typicalRange: string;
  };
  categories: Category[];
  competitors: CompetitorInfo[];
  searchResults: SearchResult[];
}

export interface Category {
  name: string;
  relevance: "primary" | "secondary" | "adjacent";
  searchTerms: string[];
}

export interface CompetitorInfo {
  name: string;
  brand: string;
  priceRange: string;
  keyDifferentiator: string;
  strengthsVsProduct: string[];
  weaknessesVsProduct: string[];
}

export interface SearchResult {
  query: string;
  results: {
    title: string;
    url: string;
    content: string;
    score: number;
  }[];
}

// === Stage 2: Personas ===
export interface RetailerPersonas {
  retailerName: string;
  retailerCharacteristics: {
    shopperProfile: string;
    priceSensitivity: string;
    shoppingMotivation: string;
    contentStyle: string;
  };
  personas: ShopperPersona[];
  searchQueryAnalysis: SearchQueryCluster[];
  methodology: string;
}

export interface ShopperPersona {
  id: string;
  archetypeName: string;
  tagline: string;
  demographics: {
    ageRange: string;
    householdType: string;
    incomeLevel: string;
    techSavviness: string;
  };
  psychographics: {
    values: string[];
    painPoints: string[];
    aspirations: string[];
    decisionStyle: string;
  };
  shoppingBehavior: {
    retailerPreference: string;
    browsingPattern: string;
    purchaseTriggers: string[];
    objections: string[];
  };
  searchQueries: string[];
  contentPreferences: string[];
  relevantCategories: string[];
  sourceEvidence: SourceQuote[];
  clusterCoordinates: {
    priceVsQuality: number;
    convenienceVsControl: number;
    estimatedSegmentSize: number;
  };
}

export interface SourceQuote {
  text: string;
  source: string;
  url: string;
  relevance: string;
}

// === Research Evidence Metadata ===
export interface ResearchQuery {
  query: string;
  resultCount: number;
  sourceType: "reddit" | "reviews" | "forums" | "articles" | "guides";
  personasInformed: string[];
}

export interface ResearchStats {
  totalSourcesScanned: number;
  totalWordsAnalyzed: number;
  totalQuotesExtracted: number;
  researchQueries: ResearchQuery[];
  breakdown: {
    reddit: number;
    reviews: number;
    forums: number;
    articles: number;
    guides: number;
  };
  scannedPages: { title: string; url: string; sourceType: string }[];
}

export interface SearchQueryCluster {
  intent: string;
  queries: SearchQuery[];
}

export interface SearchQuery {
  query: string;
  estimatedVolume: "high" | "medium" | "low";
  volumeReasoning: string;
  intent: "informational" | "commercial" | "transactional" | "navigational";
  personaIds: string[];
  retailerSpecific: boolean;
}

// === Clustering for Visualization ===
export interface ClusteringData {
  dimensions: { x: string; y: string };
  points: ClusterPoint[];
}

export interface ClusterPoint {
  personaId: string;
  x: number;
  y: number;
  size: number;
  label: string;
}

// === Stage 3: Insights ===
export interface RetailerInsights {
  retailerName: string;
  competitivePositioning: {
    summary: string;
    vsCompetitors: CompetitorPosition[];
    uniqueSellingPoints: string[];
    vulnerabilities: string[];
  };
  contentGaps: ContentGap[];
  messagingAngles: MessagingAngle[];
  recommendations: Recommendation[];
  searchJourney: SearchJourneyFunnel | null;
  contentReadiness: ContentReadinessScore | null;
  contentReadinessAfter: ContentReadinessScore | null;
  painPointFixes: PainPointFix[];
  competitorContentGaps: CompetitorContentGap[];
  seasonalSignals: SeasonalSignal[];
  objectionMap: ShopperObjection[];
  pricePerception: PricePerceptionAnalysis | null;
  reviewStrategy: ReviewStrategy | null;
  keywordGaps: KeywordGap[];
}

export interface CompetitorPosition {
  competitorName: string;
  positioningStatement: string;
  keyBattleground: string;
  winStrategy: string;
  mostRelevantPersonas?: string[];
  verified?: boolean;
}

export interface ContentGap {
  gap: string;
  importance: "critical" | "high" | "medium";
  targetPersonas: string[];
  recommendation: string;
}

export interface MessagingAngle {
  angle: string;
  targetPersonas: string[];
  emotionalHook: string;
  proofPoints: string[];
  proofPointEvidence?: number[];
  channelFit: string[];
}

export interface Recommendation {
  priority: number;
  action: string;
  rationale: string;
  expectedImpact: string;
  personaAlignment: string[];
}

// === Enhanced Insights ===
export interface SearchJourneyFunnel {
  stages: {
    stage: "awareness" | "research" | "comparison" | "purchase_intent";
    label: string;
    queryCount: number;
    exampleQueries: string[];
    stageQueries: string[];
    dropoffInsight: string;
  }[];
}

export interface ContentReadinessScore {
  overallScore: number; // 0-100, calculated from categories
  categories: {
    category: string;
    score: number;
    maxScore: number;
    items: { label: string; status: "pass" | "fail" }[];
    status: "strong" | "adequate" | "weak" | "missing";
  }[];
}

export interface PainPointFix {
  painPoint: string;
  mentionCount: number;
  evidenceBacked: boolean;
  currentCoverage: "covered" | "partial" | "missing";
  contentFix: string;
  placement: string;
  personaIds: string[];
}

export interface CompetitorContentGap {
  competitorName: string;
  theirStrength: string;
  ourGap: string;
  verified?: boolean;
  fixAction: string;
}

export interface SeasonalSignal {
  signal: string;
  type: "seasonal" | "evergreen" | "trending";
  timing: string;
  queryShare: string;
  recommendation: string;
}

export interface ShopperObjection {
  objection: string;
  severity: "high" | "medium" | "low";
  personaIds: string[];
  frequency: string;
  rebuttal: string;
  rebuttalVerified?: boolean;
  placement: string;
  contentExample: string;
}

export interface PricePerceptionAnalysis {
  overallPerception: "overpriced" | "fair" | "good_value" | "premium_justified";
  perceptionSummary: string;
  priceSignals: {
    signal: string;
    sentiment: "positive" | "negative" | "neutral";
    frequency: string;
  }[];
  perPersona: {
    personaId: string;
    perception: string;
    reframingStrategy: string;
  }[];
  vsCompetitorPricing: {
    competitorName: string;
    theirPrice: string;
    priceVerified?: boolean;
    perception: string;
    strategy: string;
  }[];
}

export interface ReviewStrategy {
  idealReviewProfile: string;
  reviewThemes: {
    theme: string;
    targetPersonaIds: string[];
    importance: "critical" | "high" | "medium";
    exampleReview: string;
  }[];
  negativeReviewResponses: {
    complaintTheme: string;
    frequency: string;
    evidenceBacked?: boolean;
    responseTemplate: string;
  }[];
}

export interface KeywordGap {
  keyword: string;
  searchVolume: "high" | "medium" | "low";
  personaIds: string[];
  currentPresence: "missing" | "weak" | "partial";
  recommendedPlacement: string;
  priority: "critical" | "high" | "medium";
  queryMatches?: number;
}

// === Stage 4: Content ===
export interface MockProductPage {
  retailerSlug: string;
  title: string;
  subtitle: string;
  price: string;
  rating: { stars: number; count: string };
  bullets: string[];
  description: string;
  enhancedContent: string;
  comparisonTable: {
    headers: string[];
    rows: { product: string; values: string[] }[];
  } | null;
  annotations: ContentAnnotation[];
  designNotes: string;
}

export interface ContentAnnotation {
  sectionId: string;
  sectionName: string;
  reasoning: string;
  personaTarget: string[];
  sourceInsights: string[];
}

export interface CampaignBrief {
  targetPersonaId: string;
  campaignName: string;
  objective: string;
  keyMessage: string;
  channels: string[];
  callToAction: string;
  toneGuide: string;
  reasoning: string;
}

export interface SocialAdCopy {
  platform: "facebook" | "instagram" | "tiktok" | "pinterest";
  format: string;
  headline: string;
  primaryText: string;
  callToAction: string;
  imageDirection: string;
  targetPersonaId: string;
  reasoning: string;
  hashtags: string[];
}

// === Retailer Results (per analysis-retailer pair) ===
export interface RetailerResult {
  id: string;
  analysisId: string;
  retailerSlug: string;
  retailerName: string;
  status: RetailerResultStatus;
  personas: RetailerPersonas | null;
  searchQueries: SearchQuery[] | null;
  clusteringData: ClusteringData | null;
  competitivePositioning: RetailerInsights | null;
  mockProductPage: MockProductPage | null;
  campaignBriefs: CampaignBrief[] | null;
  socialAdCopy: SocialAdCopy[] | null;
  sources: SourceQuote[];
  researchStats: ResearchStats | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// === Pipeline Progress ===
export interface PipelineEvent {
  type: "stage_start" | "stage_progress" | "stage_complete" | "discovery" | "error" | "complete";
  stage: string;
  message: string;
  progress: number;
  retailer?: string;
  discovery?: string;
  timestamp: string;
}

// === Retailer Definition ===
export interface RetailerDefinition {
  slug: string;
  name: string;
  color: string;
  domain: string;
  pageLayout: string;
  voiceNotes: string;
  searchBehavior: string;
}
