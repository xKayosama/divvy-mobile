import { currencyScale, validAmount } from "../groups/money";
import type { ReceiptExtraction } from "../receipts/types";
import type { ExpenseItem } from "./types";

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
  if (!validAmount(amount, currency))
    return { error: "Enter a valid expense total." };
  const total = BigInt(Math.round(Number(amount) * scale));
  if (units !== total)
    return {
      error:
        "Item totals must match the expense total. Add tax or tip as separate assigned items, or correct the totals.",
    };
  return {
    error: "",
    items: normalized,
    participants: [...totals].map(([userId, units]) => ({
      userId,
      amount: Number(units) / scale,
    })),
  };
}
