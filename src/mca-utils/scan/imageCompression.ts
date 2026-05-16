/** Client-side scan image compression before upload / offline queue. */

export const SCAN_MAX_EDGE_PX = 1600;
export const SCAN_JPEG_QUALITY = 0.85;

export type CompressImageOptions = {
  maxEdge?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
};

export function computeTargetDimensions(
  width: number,
  height: number,
  maxEdge: number
): { width: number; height: number } {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function shouldCompressScanFile(file: File, maxEdge = SCAN_MAX_EDGE_PX): boolean {
  if (file.size > 900_000) return true;
  return !file.type.includes("jpeg") && file.size > 350_000;
}

/**
 * Downscale and compress an image file for scan upload (max edge + JPEG/WebP).
 * Returns the original file when compression is unavailable or fails.
 */
export async function compressImageForScan(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const maxEdge = options.maxEdge ?? SCAN_MAX_EDGE_PX;
  const quality = options.quality ?? SCAN_JPEG_QUALITY;
  const outMime = options.mimeType ?? "image/jpeg";

  if (typeof document === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height, maxEdge);
    if (
      width === bitmap.width &&
      height === bitmap.height &&
      file.size < 500_000 &&
      file.type === outMime
    ) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), outMime, quality);
    });
    if (!blob) return file;

    const ext = outMime === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "scan";
    return new File([blob], `${base}.${ext}`, { type: outMime, lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function compressFilesForScan(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImageForScan(f)));
}
