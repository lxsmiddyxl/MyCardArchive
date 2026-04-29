import type { TradeLineInput, TradeStatus } from "@/lib/trading/types";

export type TradeAction =
  | "send"
  | "accept"
  | "decline"
  | "counter"
  | "resend"
  | "complete"
  | "withdraw";

const ACTIVE: TradeStatus[] = ["draft", "sent", "countered"];

export function isTradeStatus(s: string): s is TradeStatus {
  return (
    s === "draft" ||
    s === "sent" ||
    s === "accepted" ||
    s === "declined" ||
    s === "countered" ||
    s === "completed"
  );
}

export function isActiveTradeStatus(s: TradeStatus): boolean {
  return ACTIVE.includes(s);
}

export function validateDraftLines(
  offerLines: TradeLineInput[],
  requestLines: TradeLineInput[]
): { ok: true } | { ok: false; error: string } {
  const uniq = (lines: TradeLineInput[],
  label: string): { ok: true } | { ok: false; error: string } => {
    const seen = new Set<string>();
    for (const l of lines) {
      if (!l.cardId?.trim()) {
        return { ok: false, error: `Invalid card id in ${label}.` };
      }
      if (!Number.isFinite(l.quantity) || l.quantity < 1) {
        return { ok: false, error: `Invalid quantity in ${label}.` };
      }
      if (seen.has(l.cardId)) {
        return { ok: false, error: `Duplicate card in ${label}. Combine quantity instead.` };
      }
      seen.add(l.cardId);
    }
    return { ok: true };
  };

  const a = uniq(offerLines, "your offer");
  if (!a.ok) return a;
  const b = uniq(requestLines, "their offer");
  if (!b.ok) return b;

  if (offerLines.length === 0 && requestLines.length === 0) {
    return { ok: false, error: "Add at least one card on one side of the trade." };
  }
  return { ok: true };
}

export function canApplyAction(
  status: TradeStatus,
  action: TradeAction,
  role: "creator" | "counterparty"
): { ok: true; next: TradeStatus } | { ok: false; error: string } {
  switch (action) {
    case "send":
      if (role !== "creator") return { ok: false, error: "Only the creator can send a trade." };
      if (status !== "draft") return { ok: false, error: "Only draft trades can be sent." };
      return { ok: true, next: "sent" };
    case "resend":
      if (role !== "creator") return { ok: false, error: "Only the creator can resend." };
      if (status !== "countered") return { ok: false, error: "Resend after a counteroffer only." };
      return { ok: true, next: "sent" };
    case "accept":
      if (role !== "counterparty") return { ok: false, error: "Only the counterparty can accept." };
      if (status !== "sent" && status !== "countered") {
        return { ok: false, error: "This trade cannot be accepted in its current state." };
      }
      return { ok: true, next: "accepted" };
    case "decline":
      if (role !== "counterparty") return { ok: false, error: "Only the counterparty can decline." };
      if (status !== "sent" && status !== "countered") {
        return { ok: false, error: "This trade cannot be declined in its current state." };
      }
      return { ok: true, next: "declined" };
    case "counter":
      if (role !== "counterparty") return { ok: false, error: "Only the counterparty can counter." };
      if (status !== "sent") {
        return { ok: false, error: "Counteroffers apply to trades sent by the other party." };
      }
      return { ok: true, next: "countered" };
    case "complete":
      if (status !== "accepted") {
        return { ok: false, error: "Complete is only available after acceptance." };
      }
      return { ok: true, next: "completed" };
    case "withdraw":
      if (role !== "creator") return { ok: false, error: "Only the creator can withdraw a sent trade." };
      if (status !== "sent") {
        return { ok: false, error: "Withdraw only applies to sent trades." };
      }
      return { ok: true, next: "declined" };
    default:
      return { ok: false, error: "Unknown action." };
  }
}
