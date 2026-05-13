import { z } from "zod";

export const bindersPostBodySchema = z.object({
  name: z.string().trim().min(1, "name is required").max(200),
  description: z.union([z.string().max(8000), z.null()]).optional(),
});

export const decksCreateBodySchema = z
  .object({
    name: z.string().trim().min(1, "name is required").max(200),
    description: z.string().max(8000).optional().default(""),
    format: z.string().max(64).optional(),
  })
  .transform((o) => ({
    name: o.name,
    description: o.description,
    format: o.format?.trim() ? o.format.trim() : "standard",
  }));

const tradeLineSchema = z.object({
  cardId: z.string().trim().min(1).max(128),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
});

export const tradesCreateBodySchema = z
  .object({
    counterpartyId: z.string().trim().uuid("counterpartyId must be a valid UUID"),
    sendNow: z.boolean().optional().default(false),
    offerLines: z.array(tradeLineSchema).optional(),
    offerSideA: z.array(tradeLineSchema).optional(),
    requestLines: z.array(tradeLineSchema).optional(),
    offerSideB: z.array(tradeLineSchema).optional(),
  })
  .transform((raw) => {
    const offerLines =
      raw.offerLines && raw.offerLines.length > 0 ? raw.offerLines : raw.offerSideA ?? [];
    const requestLines =
      raw.requestLines && raw.requestLines.length > 0 ? raw.requestLines : raw.offerSideB ?? [];
    return {
      counterpartyId: raw.counterpartyId,
      sendNow: raw.sendNow,
      offerLines,
      requestLines,
    };
  });

export type TradesCreateBody = z.infer<typeof tradesCreateBodySchema>;
