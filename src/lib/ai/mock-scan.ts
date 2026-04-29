/**
 * Stand-in for a vision / OCR model when `USE_REAL_MODEL` is not enabled.
 */

export const USE_REAL_MODEL = process.env.USE_REAL_MODEL === "true";

export async function mockScanCard(
  _imageBuffer: Buffer
): Promise<Record<string, unknown>> {
  void _imageBuffer;
  return {
    name: "Charizard",
    number: "4/102",
    rarity: "Holo",
    image_url: null,
  };
}
