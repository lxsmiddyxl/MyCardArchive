import "server-only";

import sharp from "sharp";

/**
 * EXIF auto-rotate, optional edge trim (tighter crop), resize, grayscale,
 * histogram normalize, and mild gamma for OCR-friendly contrast.
 */
export async function preprocessImageForOcr(buffer: Buffer): Promise<Buffer> {
  const build = (useTrim: boolean) => {
    let pipeline = sharp(buffer, { failOn: "none", sequentialRead: true }).rotate();
    if (useTrim) {
      pipeline = pipeline.trim({ threshold: 32 });
    }
    return pipeline
      .resize({
        width: 1600,
        height: 2200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .grayscale()
      .normalize()
      .gamma(1.08)
      .png({ compressionLevel: 4, adaptiveFiltering: true });
  };

  try {
    return await build(true).toBuffer();
  } catch {
    return await build(false).toBuffer();
  }
}
