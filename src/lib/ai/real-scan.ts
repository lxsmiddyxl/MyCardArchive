import type { RawAIResponse } from "@/lib/types/ai";

const CARD_JSON_INSTRUCTION = `You are analyzing a photo of a trading or collectible card.
Return ONLY valid JSON (no markdown fences) with exactly these keys:
{
  "name": string,
  "number": string,
  "rarity": string,
  "image_url": string | null
}
Use empty strings if a field is unreadable. Use null for image_url unless the image clearly shows a public product image URL (usually omit and use null).`;

function sniffMime(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    return "image/gif";
  }
  return "image/jpeg";
}

function fixMime(m: string): string {
  const t = m.trim();
  return t.includes("/") ? t : "image/jpeg";
}

function parseJsonFromModelText(text: unknown): RawAIResponse | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  try {
    const o = JSON.parse(trimmed) as unknown;
    if (o && typeof o === "object" && !Array.isArray(o)) {
      return o as RawAIResponse;
    }
  } catch {
    const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) {
      try {
        const o = JSON.parse(fence[1].trim()) as unknown;
        if (o && typeof o === "object" && !Array.isArray(o)) {
          return o as RawAIResponse;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function scanOpenAI(imageBuffer: Buffer, mime: string): Promise<RawAIResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return { __config_error: "OPENAI_API_KEY is not set." };
  }

  const model = process.env.OPENAI_VISION_MODEL?.trim() || "gpt-4o-mini";
  const b64 = imageBuffer.toString("base64");
  const dataUrl = `data:${mime};base64,${b64}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: CARD_JSON_INSTRUCTION },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 600,
      }),
    });

    const json = (await res.json().catch(() => null)) as Record<string, any> | null;

    if (!res.ok) {
      const msg =
        typeof json?.error?.message === "string"
          ? json.error.message
          : `OpenAI request failed (${res.status})`;
      return {
        __provider_error: "openai",
        __http_status: res.status,
        __message: msg.slice(0, 500),
      };
    }

    const content = json?.choices?.[0]?.message?.content;
    const parsed = parseJsonFromModelText(content);
    if (parsed) {
      return { ...parsed, _provider: "openai", _model: model };
    }

    return {
      __parse_failed: true,
      _provider: "openai",
      _model: model,
      _raw_text_sample:
        typeof content === "string" ? content.slice(0, 1500) : null,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : "unknown_error";
    return { __provider_error: "openai_exception", __message: err.slice(0, 500) };
  }
}

async function scanGemini(imageBuffer: Buffer, mime: string): Promise<RawAIResponse> {
  const apiKey = process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    return { __config_error: "GOOGLE_API_KEY is not set." };
  }

  const model =
    process.env.GEMINI_VISION_MODEL?.trim() || "gemini-1.5-flash";
  const b64 = imageBuffer.toString("base64");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: CARD_JSON_INSTRUCTION },
              {
                inline_data: {
                  mime_type: mime,
                  data: b64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    const json = (await res.json().catch(() => null)) as Record<string, any> | null;

    if (!res.ok) {
      const msg =
        typeof json?.error?.message === "string"
          ? json.error.message
          : `Gemini request failed (${res.status})`;
      return {
        __provider_error: "gemini",
        __http_status: res.status,
        __message: msg.slice(0, 500),
      };
    }

    const text =
      json?.candidates?.[0]?.content?.parts?.[0]?.text ??
      json?.candidates?.[0]?.content?.parts?.[0];

    const parsed = parseJsonFromModelText(
      typeof text === "string" ? text : text != null ? String(text) : null
    );
    if (parsed) {
      return { ...parsed, _provider: "gemini", _model: model };
    }

    return {
      __parse_failed: true,
      _provider: "gemini",
      _model: model,
      _raw_text_sample:
        typeof text === "string" ? text.slice(0, 1500) : null,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : "unknown_error";
    return { __provider_error: "gemini_exception", __message: err.slice(0, 500) };
  }
}

/**
 * True when `realScanCard` could not run because configuration is missing.
 */
export function isRealScanConfigError(
  raw: unknown
): raw is { __config_error: string } {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "__config_error" in raw &&
    typeof (raw as { __config_error: unknown }).__config_error === "string"
  );
}

export function getRealScanConfigError(raw: { __config_error: string }): string {
  return raw.__config_error;
}

/**
 * Calls OpenAI Vision (if `OPENAI_API_KEY`) otherwise Gemini Vision (`GOOGLE_API_KEY`).
 * Never throws; returns best-effort objects for {@link normalizeCardAIResponse}.
 */
export async function realScanCard(imageBuffer: Buffer): Promise<RawAIResponse | Record<string, unknown>> {
  try {
    if (!imageBuffer?.length) {
      return { __empty_buffer: true };
    }

    const mime = fixMime(sniffMime(imageBuffer));

    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    const googleKey = process.env.GOOGLE_API_KEY?.trim();

    if (!openaiKey && !googleKey) {
      return {
        __config_error:
          "USE_REAL_MODEL is enabled but neither OPENAI_API_KEY nor GOOGLE_API_KEY is set. Add one in your environment.",
      };
    }

    if (openaiKey) {
      return await scanOpenAI(imageBuffer, mime);
    }

    return await scanGemini(imageBuffer, mime);
  } catch (e) {
    const err = e instanceof Error ? e.message : "unknown_error";
    return { __fatal: true, __message: err.slice(0, 500) };
  }
}
