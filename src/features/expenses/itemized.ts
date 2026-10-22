import { currencyScale, validAmount } from "../groups/money";
import type { ReceiptExtraction } from "../receipts/types";
import type { ExpenseItem, ItemizedAdjustments } from "./types";

export type AdjustmentDraft = {
  amount: string;
  allocation: "EQUAL" | "PROPORTIONAL";
};
export type AdjustmentsDraft = Record<"tax" | "tip", AdjustmentDraft>;
export function adjustmentDrafts(
  saved?: ItemizedAdjustments,
): AdjustmentsDraft {
  return {
    tax: {
      amount: String(saved?.tax?.amount ?? ""),
      allocation: saved?.tax?.allocation ?? "PROPORTIONAL",
    },
    tip: {
      amount: String(saved?.tip?.amount ?? ""),
      allocation: saved?.tip?.allocation ?? "PROPORTIONAL",
    },
  };
}

export const MAX_EXPENSE_ITEMS = 100;
export type ItemDraft = {
  id: string;
  description: string;
  quantity: string;
  amount: string;
  memberIds: string[];
};
let sequence = 0;
export function emptyItem(): ItemDraft {
  return {
    id: `item-${++sequence}`,
    description: "",
    quantity: "1",
    amount: "",
    memberIds: [],
  };
}
export function existingItemDrafts(items: ExpenseItem[]): ItemDraft[] {
  return items.map((item) => ({
    ...emptyItem(),
    description: item.description,
    quantity: String(item.quantity),
    amount: String(item.amount),
    memberIds: [...item.memberIds],
  }));
}
export function receiptItemDrafts(receipt: ReceiptExtraction): ItemDraft[] {
  // Never invent missing amounts, descriptions, quantities, or member assignments.
  return receipt.items.map((item) => ({
    ...emptyItem(),
    description: item.description ?? "",
    quantity: item.quantity == null ? "" : String(item.quantity),
    amount: item.total == null ? "" : String(item.total),
    memberIds: [],
  }));
}
export function itemizedPreview(
  items: ItemDraft[],
  amount: string,
  currency: string,
  activeMemberIds: string[],
  adjustments: AdjustmentsDraft = adjustmentDrafts(),
) {
  const scale = currencyScale(currency);
  const totals = new Map<string, bigint>();
  const normalized: ExpenseItem[] = [];
  let units = 0n;
  if (!items.length || items.length > MAX_EXPENSE_ITEMS)
    return { error: `Add between 1 and ${MAX_EXPENSE_ITEMS} items.` };
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const fail = (message: string) => ({
      error: `Item ${index + 1}: ${message}`,
    });
    if (!item.description.trim() || item.description.trim().length > 200)
      return fail("Enter a description of up to 200 characters.");
    const quantity = item.quantity.trim().replace(",", ".");
    if (!validAmount(quantity, "KWD") || Number(quantity) > 1000000)
      return fail(
        "Enter a positive quantity, up to 1,000,000 with at most 3 decimals.",
      );
    const value = item.amount.trim().replace(",", ".");
    if (!validAmount(value, currency, true))
      return fail(`Enter a valid line total in ${currency}.`);
    if (
      !item.memberIds.length ||
      new Set(item.memberIds).size !== item.memberIds.length ||
      item.memberIds.some((id) => !activeMemberIds.includes(id))
    )
      return fail("Assign active members and remove unavailable members.");
    const lineUnits = BigInt(Math.round(Number(value) * scale));
    units += lineUnits;
    const base = lineUnits / BigInt(item.memberIds.length);
    const remainder = lineUnits % BigInt(item.memberIds.length);
    item.memberIds.forEach((id, i) =>
      totals.set(
        id,
        (totals.get(id) ?? 0n) + base + (i === 0 ? remainder : 0n),
      ),
    );
    normalized.push({
      description: item.description.trim(),
      quantity: Number(quantity),
      amount: Number(value),
      memberIds: [...item.memberIds],
    });
  }
  const normalizedAdjustments: ItemizedAdjustments = {};
  const baseShares = [...totals.values()];
  const breakdown = new Map(
    [...totals].map(([id, value]) => [
      id,
      { items: Number(value) / scale, tax: 0, tip: 0 },
    ]),
  );
  for (const key of ["tax", "tip"] as const) {
    const charge = adjustments[key];
    const value = charge.amount.trim().replace(",", ".") || "0";
    if (
      !validAmount(value, currency, true) ||
      !["EQUAL", "PROPORTIONAL"].includes(charge.allocation)
    )
      return {
        error: `Enter a valid nonnegative ${key} amount in ${currency}.`,
      };
    const extra = BigInt(Math.round(Number(value) * scale));
    const weights = baseShares.map((value) =>
      charge.allocation === "EQUAL" ? 1n : value,
    );
    const denominator = weights.reduce((sum, value) => sum + value, 0n);
    if (extra > 0n && denominator === 0n)
      return {
        error: `Cannot allocate ${key} by item amounts when items total zero. Choose equally.`,
      };
    if (extra > 0n) {
      const parts = weights.map((weight, index) => ({
        index,
        units: (extra * weight) / denominator,
        remainder: (extra * weight) % denominator,
      }));
      const remaining =
        extra - parts.reduce((sum, part) => sum + part.units, 0n);
      const ordered = [...parts].sort((a, b) =>
        a.remainder === b.remainder
          ? a.index - b.index
          : a.remainder > b.remainder
            ? -1
            : 1,
      );
      for (let i = 0; i < Number(remaining); i++) ordered[i].units++;
      [...totals.keys()].forEach((id, i) => {
        totals.set(id, totals.get(id)! + parts[i].units);
        breakdown.get(id)![key] = Number(parts[i].units) / scale;
      });
    }
    units += extra;
    normalizedAdjustments[key] = {
      amount: Number(value),
      allocation: charge.allocation,
    };
  }
  if (!validAmount(amount, currency))
    return { error: "Enter a valid expense total." };
  const total = BigInt(Math.round(Number(amount) * scale));
  if (units !== total)
    return {
      error:
        "Items plus tax and tip must match the expense total. Check the line totals and extras.",
    };
  return {
    error: "",
    items: normalized,
    adjustments: normalizedAdjustments,
    breakdown: Object.fromEntries(breakdown),
    participants: [...totals].map(([userId, units]) => ({
      userId,
      amount: Number(units) / scale,
    })),
  };
}
