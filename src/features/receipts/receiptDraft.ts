import { currencyDigits } from "../groups/money";
import type { ReceiptExtraction } from "./types";
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
export function receiptDraft(receipt: ReceiptExtraction) {
  const parsed = receipt.date ? new Date(`${receipt.date}T00:00:00Z`) : null;
  // Preserve excess extracted decimals so the form asks for correction rather than rounding.
  const total = receipt.total;
  const text = String(total);
  const amount = total != null && Number.isFinite(total) && total > 0
    ? text.includes("e") ? text : total.toFixed(Math.max(currencyDigits(receipt.currency), text.split(".")[1]?.length ?? 0))
    : "";
  return {
    description: receipt.merchant?.trim() ?? "",
    amount,
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
