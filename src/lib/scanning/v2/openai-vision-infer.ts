import "server-only";

import type { ScanV2HoloStatus, ScanV2VisionPrediction } from "@/lib/scanning/v2/vision-types";
import { stubVisionPrediction } from "@/lib/scanning/v2/stub-vision";

const VISION_TIMEOUT_MS = 55_000;

function holoFromRaw(s: string): ScanV2HoloStatus {
  const t = s.trim().toLowerCase().replace(/\s+/g, "_");
  if (t === "reverse_holo" || t === "reverseholo") return "reverse_holo";
  if (t === "holo" || t === "holofoil" || t === "ultra") return "holo";
  if (t === "none" || t === "non_holo" || t === "normal") return "none";
  return "unknown";
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function pickApiKey(): string | null {
  const a = process.env.SCAN_V2_OPENAI_API_KEY?.trim();
  if (a) return a;
  const b = process.env.OPENAI_API_KEY?.trim();
  return b || null;
}

/**
 * Calls OpenAI chat completions with vision (`gpt-4o-mini` by default).
 * Returns stub prediction when no API key or on failure.
 */
export async function inferCardWithOpenAiVision(
  imageBuffer: Buffer,
  mimeType: string
): Promise<ScanV2VisionPrediction> {
  const apiKey = pickApiKey();
  if (!apiKey) {
    return stubVisionPrediction("No SCAN_V2_OPENAI_API_KEY or OPENAI_API_KEY set.");
  }

  const model = process.env.SCAN_V2_VISION_MODEL?.trim() || "gpt-4o-mini";
  const baseUrl = process.env.SCAN_V2_OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const safeMime = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
  const b64 = imageBuffer.toString("base64");
  const dataUrl = `data:${safeMime};base64,${b64}`;

  const system =
    "You identify Pokémon Trading Card Game cards from photos. Reply with compact JSON only.";

  const userText = `Analyze this Pokémon TCG card (front). Return a single JSON object with keys:
set_name (string, expansion name if visible, else ""),
set_code (short printed code if visible, else ""),
card_name (string),
number (collector number only, no slash total, else ""),
rarity (string, else ""),
holo_status (one of: none, reverse_holo, holo, unknown),
confidence (number from 0 to 1 for your overall certainty).`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VISION_TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return stubVisionPrediction(
        `Vision API HTTP ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`
      );
    }

    const payload = (await res.json().catch(() => null)) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return stubVisionPrediction("Empty model response.");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return stubVisionPrediction("Model returned non-JSON.");
    }

    const asStr = (k: string) => (typeof parsed[k] === "string" ? (parsed[k] as string).trim() : "");
    const confRaw = parsed.confidence;
    const conf =
      typeof confRaw === "number"
        ? clamp01(confRaw)
        : typeof confRaw === "string"
          ? clamp01(parseFloat(confRaw))
          : 0.35;

    return {
      set_name_guess: asStr("set_name") || asStr("setName"),
      set_code_guess: asStr("set_code") || asStr("setCode"),
      card_name_guess: asStr("card_name") || asStr("cardName"),
      card_number_guess: asStr("number") || asStr("card_number") || asStr("cardNumber"),
      rarity_guess: asStr("rarity"),
      holo_status: holoFromRaw(asStr("holo_status") || asStr("holoStatus") || "unknown"),
      overall_confidence: conf,
      provider: "openai_vision",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Vision request failed";
    return stubVisionPrediction(msg);
  } finally {
    clearTimeout(timer);
  }
}
