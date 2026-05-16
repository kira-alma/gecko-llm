import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";
import type {
  Analysis,
  AnalysisStatus,
  RetailerResult,
  RetailerResultStatus,
  ProductResearch,
  RetailerPersonas,
  RetailerInsights,
  MockProductPage,
  CampaignBrief,
  SocialAdCopy,
  SearchQuery,
  ClusteringData,
  SourceQuote,
  ResearchStats,
} from "./types";

const DB_PATH = path.join(process.cwd(), "data", "geckollm.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function safeAddColumn(db: Database.Database, table: string, column: string, type: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch {
    // Column already exists — ignore
  }
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      current_stage TEXT DEFAULT NULL,
      current_stage_progress REAL DEFAULT 0,
      product_research TEXT DEFAULT NULL,
      competitors TEXT DEFAULT '[]',
      selected_categories TEXT DEFAULT '[]',
      selected_retailers TEXT DEFAULT '[]',
      error_message TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS retailer_results (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
      retailer_slug TEXT NOT NULL,
      retailer_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      personas TEXT DEFAULT NULL,
      search_queries TEXT DEFAULT NULL,
      clustering_data TEXT DEFAULT NULL,
      competitive_positioning TEXT DEFAULT NULL,
      mock_product_page TEXT DEFAULT NULL,
      campaign_briefs TEXT DEFAULT NULL,
      social_ad_copy TEXT DEFAULT NULL,
      sources TEXT DEFAULT '[]',
      research_stats TEXT DEFAULT NULL,
      error_message TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(analysis_id, retailer_slug)
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_retailer_results_analysis ON retailer_results(analysis_id);
  `);

  // Migrations — safely add columns that may not exist in older DBs
  safeAddColumn(db, "analyses", "selected_categories", "TEXT DEFAULT '[]'");
  safeAddColumn(db, "retailer_results", "research_stats", "TEXT DEFAULT NULL");
}

// === Helpers ===
function jsonParse<T>(val: string | null): T | null {
  if (!val) return null;
  try {
    return JSON.parse(val) as T;
  } catch {
    return null;
  }
}

function rowToAnalysis(row: Record<string, unknown>): Analysis {
  return {
    id: row.id as string,
    productName: row.product_name as string,
    status: row.status as AnalysisStatus,
    currentStage: row.current_stage as string | null,
    currentStageProgress: row.current_stage_progress as number,
    productResearch: jsonParse<ProductResearch>(row.product_research as string),
    competitors: jsonParse<string[]>(row.competitors as string) ?? [],
    selectedCategories: jsonParse<string[]>(row.selected_categories as string) ?? [],
    selectedRetailers: jsonParse<string[]>(row.selected_retailers as string) ?? [],
    errorMessage: row.error_message as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToRetailerResult(row: Record<string, unknown>): RetailerResult {
  return {
    id: row.id as string,
    analysisId: row.analysis_id as string,
    retailerSlug: row.retailer_slug as string,
    retailerName: row.retailer_name as string,
    status: row.status as RetailerResultStatus,
    personas: jsonParse<RetailerPersonas>(row.personas as string),
    searchQueries: jsonParse<SearchQuery[]>(row.search_queries as string),
    clusteringData: jsonParse<ClusteringData>(row.clustering_data as string),
    competitivePositioning: jsonParse<RetailerInsights>(row.competitive_positioning as string),
    mockProductPage: jsonParse<MockProductPage>(row.mock_product_page as string),
    campaignBriefs: jsonParse<CampaignBrief[]>(row.campaign_briefs as string),
    socialAdCopy: jsonParse<SocialAdCopy[]>(row.social_ad_copy as string),
    sources: jsonParse<SourceQuote[]>(row.sources as string) ?? [],
    researchStats: jsonParse<ResearchStats>(row.research_stats as string),
    errorMessage: row.error_message as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// === Analysis CRUD ===
export function createAnalysis(productName: string): Analysis {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO analyses (id, product_name) VALUES (?, ?)`
  ).run(id, productName);
  return getAnalysis(id)!;
}

export function getAnalysis(id: string): Analysis | null {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM analyses WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToAnalysis(row);
}

export function listAnalyses(): Analysis[] {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM analyses ORDER BY created_at DESC`).all() as Record<string, unknown>[];
  return rows.map(rowToAnalysis);
}

export function updateAnalysis(
  id: string,
  updates: Partial<{
    status: AnalysisStatus;
    currentStage: string | null;
    currentStageProgress: number;
    productResearch: ProductResearch;
    competitors: string[];
    selectedCategories: string[];
    selectedRetailers: string[];
    errorMessage: string | null;
  }>
): void {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    sets.push("status = ?");
    values.push(updates.status);
  }
  if (updates.currentStage !== undefined) {
    sets.push("current_stage = ?");
    values.push(updates.currentStage);
  }
  if (updates.currentStageProgress !== undefined) {
    sets.push("current_stage_progress = ?");
    values.push(updates.currentStageProgress);
  }
  if (updates.productResearch !== undefined) {
    sets.push("product_research = ?");
    values.push(JSON.stringify(updates.productResearch));
  }
  if (updates.competitors !== undefined) {
    sets.push("competitors = ?");
    values.push(JSON.stringify(updates.competitors));
  }
  if (updates.selectedCategories !== undefined) {
    sets.push("selected_categories = ?");
    values.push(JSON.stringify(updates.selectedCategories));
  }
  if (updates.selectedRetailers !== undefined) {
    sets.push("selected_retailers = ?");
    values.push(JSON.stringify(updates.selectedRetailers));
  }
  if (updates.errorMessage !== undefined) {
    sets.push("error_message = ?");
    values.push(updates.errorMessage);
  }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE analyses SET ${sets.join(", ")} WHERE id = ?`).run(...values);
}

export function deleteAnalysis(id: string): void {
  const db = getDb();
  db.prepare(`DELETE FROM analyses WHERE id = ?`).run(id);
}

// === Retailer Results CRUD ===
export function createRetailerResult(
  analysisId: string,
  retailerSlug: string,
  retailerName: string
): RetailerResult {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO retailer_results (id, analysis_id, retailer_slug, retailer_name) VALUES (?, ?, ?, ?)`
  ).run(id, analysisId, retailerSlug, retailerName);
  return getRetailerResult(analysisId, retailerSlug)!;
}

export function getRetailerResult(
  analysisId: string,
  retailerSlug: string
): RetailerResult | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM retailer_results WHERE analysis_id = ? AND retailer_slug = ?`)
    .get(analysisId, retailerSlug) as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToRetailerResult(row);
}

export function getRetailerResults(analysisId: string): RetailerResult[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM retailer_results WHERE analysis_id = ? ORDER BY retailer_name`)
    .all(analysisId) as Record<string, unknown>[];
  return rows.map(rowToRetailerResult);
}

export function updateRetailerResult(
  analysisId: string,
  retailerSlug: string,
  updates: Partial<{
    status: RetailerResultStatus;
    personas: RetailerPersonas;
    searchQueries: SearchQuery[];
    clusteringData: ClusteringData;
    competitivePositioning: RetailerInsights;
    mockProductPage: MockProductPage;
    campaignBriefs: CampaignBrief[];
    socialAdCopy: SocialAdCopy[];
    sources: SourceQuote[];
    researchStats: ResearchStats;
    errorMessage: string | null;
  }>
): void {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  const jsonFields: (keyof typeof updates)[] = [
    "personas", "searchQueries", "clusteringData",
    "competitivePositioning", "mockProductPage",
    "campaignBriefs", "socialAdCopy", "sources", "researchStats",
  ];
  const columnMap: Record<string, string> = {
    status: "status",
    personas: "personas",
    searchQueries: "search_queries",
    clusteringData: "clustering_data",
    competitivePositioning: "competitive_positioning",
    mockProductPage: "mock_product_page",
    campaignBriefs: "campaign_briefs",
    socialAdCopy: "social_ad_copy",
    sources: "sources",
    researchStats: "research_stats",
    errorMessage: "error_message",
  };

  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) continue;
    const col = columnMap[key];
    if (!col) continue;
    sets.push(`${col} = ?`);
    values.push(jsonFields.includes(key as keyof typeof updates) ? JSON.stringify(val) : val);
  }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  values.push(analysisId, retailerSlug);

  db.prepare(
    `UPDATE retailer_results SET ${sets.join(", ")} WHERE analysis_id = ? AND retailer_slug = ?`
  ).run(...values);
}
