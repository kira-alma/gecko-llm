import { NextRequest, NextResponse } from "next/server";
import { createAnalysis, listAnalyses, updateAnalysis } from "@/lib/db";

export async function GET() {
  const analyses = listAnalyses();
  return NextResponse.json(analyses);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { productName, selectedRetailers } = body;

  if (!productName || typeof productName !== "string") {
    return NextResponse.json(
      { error: "productName is required" },
      { status: 400 }
    );
  }

  const analysis = createAnalysis(productName.trim());

  if (selectedRetailers && Array.isArray(selectedRetailers)) {
    updateAnalysis(analysis.id, { selectedRetailers });
  }

  return NextResponse.json(analysis, { status: 201 });
}
