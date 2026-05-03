import "server-only";

import { preprocessImageForOcr } from "@/lib/scanning/v1/preprocess";

const OCR_TIMEOUT_MS_PER_IMAGE = 28_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * Runs Tesseract on one or two buffers (front + optional back) using a single worker.
 * Back face often carries set symbol / fine print — merged text improves parsing.
 */
export async function runCardOcr(
  frontBuffer: Buffer,
  backBuffer?: Buffer | null
): Promise<string> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
      const parts: string[] = [];
      const preFrontPromise = preprocessImageForOcr(frontBuffer);
      const preBackPromise =
        backBuffer && backBuffer.length > 0
          ? preprocessImageForOcr(backBuffer).catch(() => null)
          : Promise.resolve<Buffer | null>(null);

      const recognizeSafe = async (img: Buffer, label: string): Promise<string> => {
        try {
          const { data } = await withTimeout(
            worker.recognize(img),
            OCR_TIMEOUT_MS_PER_IMAGE,
            label
          );
          return typeof data?.text === "string" ? data.text.trim() : "";
        } catch {
          return "";
        }
      };

      const preFront = await preFrontPromise;
      const frontText = await recognizeSafe(preFront, "OCR front");
      if (frontText) {
        parts.push(frontText);
      }

      const preBack = await preBackPromise;
      if (preBack) {
        const backText = await recognizeSafe(preBack, "OCR back");
        if (backText) {
          parts.push(backText);
        }
      }

      return parts.join("\n\n---\n\n").trim();
    } finally {
      await worker.terminate().catch(() => undefined);
    }
  } catch {
    return "";
  }
}
