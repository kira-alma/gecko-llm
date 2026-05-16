const OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.GECKOLLM_MODEL || "anthropic/claude-sonnet-4";

// Runtime override (set via /api/settings)
let _modelOverride: string | null = null;
export function setModelOverride(model: string | null) { _modelOverride = model; }
export function getActiveModel(): string { return _modelOverride || DEFAULT_MODEL; }

export async function callClaude(params: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  cacheSystemPrompt?: boolean;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");

  const controller = new AbortController();
  const timeoutMs = (params.maxTokens ?? 8192) > 10000 ? 300_000 : 240_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(OPENROUTER_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://geckollm.com",
        "X-Title": "GeckoLLM Retail Intelligence",
      },
      body: JSON.stringify({
        model: getActiveModel(),
        max_tokens: params.maxTokens ?? 8192,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[GeckoLLM] OpenRouter API error ${response.status}: ${text.slice(0, 500)}`);
      throw new Error(`OpenRouter error (${response.status}): ${text.slice(0, 300)}`);
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim().length === 0) {
      throw new Error("OpenRouter returned empty response");
    }
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error(`[GeckoLLM] Failed to parse OpenRouter response: ${responseText.slice(0, 200)}`);
      throw new Error(`OpenRouter returned invalid JSON: ${responseText.slice(0, 100)}`);
    }

    // Handle provider errors embedded in choices
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    // Some models return reasoning_content
    if (data.choices?.[0]?.message?.reasoning_content) {
      return data.choices[0].message.reasoning_content;
    }

    if (data.choices?.[0]?.message?.reasoning) {
      return data.choices[0].message.reasoning;
    }

    throw new Error(
      `No content in OpenRouter response: ${JSON.stringify(data).slice(0, 300)}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call Claude and extract JSON with automatic retry on parse failure.
 * On first failure, retries with a shorter prompt asking to fix the JSON.
 */
export async function callClaudeJSON<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  cacheSystemPrompt?: boolean;
}): Promise<T> {
  const raw = await callClaude(params);
  try {
    return extractJSON<T>(raw);
  } catch (firstErr) {
    console.error(`[GeckoLLM] JSON parse failed (${(firstErr as Error).message?.slice(0, 100)}), retrying...`);
    console.error(`[GeckoLLM] Response length: ${raw.length}, first 200 chars: ${raw.slice(0, 200)}`);
    console.error(`[GeckoLLM] Last 200 chars: ${raw.slice(-200)}`);
    // Retry: ask the model to produce valid JSON, sending back what we got
    const truncated = raw.length > 12000 ? raw.slice(0, 12000) + "\n...[TRUNCATED]" : raw;
    try {
      const retryRaw = await callClaude({
        systemPrompt: "You previously generated a JSON response that was truncated or malformed. Reproduce the COMPLETE, VALID JSON. Only output the JSON object, nothing else. Do not wrap in markdown fences.",
        userPrompt: `Here is the truncated/malformed response. Reproduce it as complete, valid JSON:\n\n${truncated}`,
        maxTokens: params.maxTokens ?? 8192,
      });
      return extractJSON<T>(retryRaw);
    } catch (retryErr) {
      console.error(`[GeckoLLM] Retry also failed: ${(retryErr as Error).message?.slice(0, 200)}`);
      throw retryErr;
    }
  }
}

export function extractJSON<T>(text: string): T {
  // Strategy 0: Strip fences with simple string ops (no regex — handles large responses)
  const fenceStart = text.indexOf("```json");
  const altFenceStart = fenceStart === -1 ? text.indexOf("```") : -1;
  const actualStart = fenceStart !== -1 ? fenceStart : altFenceStart;
  if (actualStart !== -1) {
    const contentStart = text.indexOf("\n", actualStart);
    if (contentStart !== -1) {
      // Find the LAST ``` in the string
      const lastFence = text.lastIndexOf("```");
      if (lastFence > contentStart) {
        const content = text.slice(contentStart + 1, lastFence).trim();
        try { return JSON.parse(content) as T; } catch { /* continue */ }
        // Try repair
        const repaired = repairTruncatedJSON(content);
        if (repaired) { try { return JSON.parse(repaired) as T; } catch { /* continue */ } }
      }
      // No closing fence — take everything after opening
      const content = text.slice(contentStart + 1).replace(/```\s*$/, "").trim();
      try { return JSON.parse(content) as T; } catch { /* continue */ }
      const repaired = repairTruncatedJSON(content);
      if (repaired) { try { return JSON.parse(repaired) as T; } catch { /* continue */ } }
    }
  }

  // Strategy 1: Direct parse
  try {
    return JSON.parse(text) as T;
  } catch {
    // continue
  }

  // Strategy 2: Extract from ```json fences (regex fallback)
  const fenceClosedMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceClosedMatch) {
    try {
      return JSON.parse(fenceClosedMatch[1].trim()) as T;
    } catch {
      const repaired = repairTruncatedJSON(fenceClosedMatch[1].trim());
      if (repaired) {
        try { return JSON.parse(repaired) as T; } catch { /* continue */ }
      }
    }
  }

  // Strategy 2b: Unclosed fence (truncated output) — greedy match to end
  const fenceOpenMatch = text.match(/```(?:json)?\s*\n?([\s\S]+)$/);
  if (fenceOpenMatch && !fenceClosedMatch) {
    const content = fenceOpenMatch[1].replace(/```\s*$/, "").trim();
    try {
      return JSON.parse(content) as T;
    } catch {
      const repaired = repairTruncatedJSON(content);
      if (repaired) {
        try { return JSON.parse(repaired) as T; } catch { /* continue */ }
      }
    }
  }

  // Strategy 3: Find the outermost { } or [ ]
  const jsonStart = text.search(/[{[]/);
  if (jsonStart !== -1) {
    const openChar = text[jsonStart];
    const closeChar = openChar === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = jsonStart; i < text.length; i++) {
      const ch = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === openChar) depth++;
      if (ch === closeChar) depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(jsonStart, i + 1)) as T;
        } catch {
          break;
        }
      }
    }
  }

  // Strategy 4: Repair truncated JSON (output cut off mid-response)
  const jsonStart2 = text.search(/[{[]/);
  if (jsonStart2 !== -1) {
    const repaired = repairTruncatedJSON(text.slice(jsonStart2));
    if (repaired) {
      try {
        return JSON.parse(repaired) as T;
      } catch {
        // continue
      }
    }
  }

  throw new Error(
    `Failed to extract JSON from response: ${text.slice(0, 200)}...`
  );
}

function repairTruncatedJSON(text: string): string | null {
  // Count unclosed braces/brackets and close them
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  if (stack.length === 0) return null; // not truncated

  // Trim trailing incomplete values (partial strings, trailing commas)
  let trimmed = text;
  if (inString) {
    // Cut back to last complete string
    const lastQuote = trimmed.lastIndexOf('"');
    if (lastQuote > 0) trimmed = trimmed.slice(0, lastQuote + 1);
  }
  // Remove trailing comma or partial key-value
  trimmed = trimmed.replace(/,\s*$/, "");
  trimmed = trimmed.replace(/,\s*"[^"]*"?\s*:?\s*$/, "");

  // Close all open brackets
  return trimmed + stack.reverse().join("");
}
