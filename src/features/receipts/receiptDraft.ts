import type { ReceiptExtraction } from "./types";
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export function receiptDraft(receipt: ReceiptExtraction) {
  const parsed = receipt.date ? new Date(`${receipt.date}T00:00:00Z`) : null;
  return {
    description: receipt.merchant?.trim() ?? "",
    amount:
      receipt.total != null &&
      Number.isFinite(receipt.total) &&
      receipt.total > 0
        ? receipt.total.toFixed(2)
        : "",
    date:
      parsed &&
      Number.isFinite(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === receipt.date
        ? receipt.date!
        : "",
    notes: receipt.items
      .map((item) => item.description?.trim())
      .filter(Boolean)
      .join(", "),
  };
}
