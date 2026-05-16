import { NextRequest, NextResponse } from "next/server";
import { getActiveModel, setModelOverride } from "@/lib/anthropic";

const AVAILABLE_MODELS = [
  // Anthropic
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", inputPrice: "$3", outputPrice: "$15" },
  { id: "anthropic/claude-opus-4-20250514", name: "Claude Opus 4", provider: "Anthropic", inputPrice: "$15", outputPrice: "$75" },
  { id: "anthropic/claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "Anthropic", inputPrice: "$0.80", outputPrice: "$4" },
  // OpenAI
  { id: "openai/gpt-5", name: "GPT-5", provider: "OpenAI", inputPrice: "$2", outputPrice: "$8" },
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI", inputPrice: "$0.40", outputPrice: "$1.60" },
  { id: "openai/gpt-4.1", name: "GPT-4.1", provider: "OpenAI", inputPrice: "$2", outputPrice: "$8" },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI", inputPrice: "$0.40", outputPrice: "$1.60" },
  { id: "openai/gpt-4.1-nano", name: "GPT-4.1 Nano", provider: "OpenAI", inputPrice: "$0.10", outputPrice: "$0.40" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI", inputPrice: "$2.50", outputPrice: "$10" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", inputPrice: "$0.15", outputPrice: "$0.60" },
  { id: "openai/o3", name: "o3 (Reasoning)", provider: "OpenAI", inputPrice: "$2", outputPrice: "$8" },
  { id: "openai/o3-mini", name: "o3 Mini (Reasoning)", provider: "OpenAI", inputPrice: "$1.10", outputPrice: "$4.40" },
  { id: "openai/o4-mini", name: "o4 Mini (Reasoning)", provider: "OpenAI", inputPrice: "$1.10", outputPrice: "$4.40" },
  // Google
  { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro Preview", provider: "Google", inputPrice: "$1.25", outputPrice: "$10" },
  { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash Preview", provider: "Google", inputPrice: "$0.15", outputPrice: "$0.60" },
  { id: "google/gemini-2.5-flash-lite-preview", name: "Gemini 2.5 Flash Lite", provider: "Google", inputPrice: "$0.075", outputPrice: "$0.30" },
  // Meta
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", provider: "Meta", inputPrice: "$0.20", outputPrice: "$0.60" },
  { id: "meta-llama/llama-4-scout", name: "Llama 4 Scout", provider: "Meta", inputPrice: "$0.15", outputPrice: "$0.40" },
  // DeepSeek
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (Reasoning)", provider: "DeepSeek", inputPrice: "$0.55", outputPrice: "$2.19" },
  { id: "deepseek/deepseek-chat-v3", name: "DeepSeek V3", provider: "DeepSeek", inputPrice: "$0.27", outputPrice: "$1.10" },
  // xAI
  { id: "x-ai/grok-3", name: "Grok 3", provider: "xAI", inputPrice: "$3", outputPrice: "$15" },
  { id: "x-ai/grok-3-mini", name: "Grok 3 Mini", provider: "xAI", inputPrice: "$0.30", outputPrice: "$0.50" },
];

export async function GET() {
  return NextResponse.json({
    activeModel: getActiveModel(),
    availableModels: AVAILABLE_MODELS,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  setModelOverride(body.model || null);
  return NextResponse.json({ activeModel: getActiveModel() });
}
