import "server-only";

import sharp from "sharp";
import type { GrayImage } from "@/mca-utils/scan/imageGray";

const MAX_W = 480;

export async function bufferToGray(buffer: Buffer): Promise<GrayImage | null> {
  try {
    const { data, info } = await sharp(buffer, { failOn: "none", sequentialRead: true })
      .rotate()
      .resize({ width: MAX_W, height: 680, fit: "inside", withoutEnlargement: true })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (!info.width || !info.height) return null;
    return { data: new Uint8Array(data), width: info.width, height: info.height };
  } catch {
    return null;
  }
}

export async function cropBufferToGray(
  buffer: Buffer,
  region: { x: number; y: number; width: number; height: number }
): Promise<GrayImage | null> {
  try {
    const meta = await sharp(buffer).metadata();
    const iw = meta.width ?? 0;
    const ih = meta.height ?? 0;
    if (!iw || !ih) return null;
    const left = Math.max(0, Math.floor(region.x));
    const top = Math.max(0, Math.floor(region.y));
    const width = Math.min(Math.floor(region.width), iw - left);
    const height = Math.min(Math.floor(region.height), ih - top);
    if (width < 8 || height < 8) return bufferToGray(buffer);
    const cropped = await sharp(buffer)
      .extract({ left, top, width, height })
      .toBuffer();
    return bufferToGray(cropped);
  } catch {
    return bufferToGray(buffer);
  }
}
