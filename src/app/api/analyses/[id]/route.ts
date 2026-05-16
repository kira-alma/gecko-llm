import { NextRequest, NextResponse } from "next/server";
import {
  getAnalysis,
  updateAnalysis,
  deleteAnalysis,
  getRetailerResults,
} from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const analysis = getAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const retailerResults = getRetailerResults(id);

  return NextResponse.json({ ...analysis, retailerResults });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const analysis = getAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  if (body.productResearch) {
    updateAnalysis(id, { productResearch: body.productResearch });
  }
  if (body.competitors) {
    updateAnalysis(id, { competitors: body.competitors });
  }
  if (body.selectedCategories) {
    updateAnalysis(id, { selectedCategories: body.selectedCategories });
  }
  if (body.selectedRetailers) {
    updateAnalysis(id, { selectedRetailers: body.selectedRetailers });
  }

  return NextResponse.json(getAnalysis(id));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteAnalysis(id);
  return NextResponse.json({ ok: true });
}
