import { splitPreview } from "../expenses/splitPreview";
import { parseShareWeight } from "../expenses/shareSplit";
import type { BillPaymentRequest, BillPaymentSplit } from "./types";

export function billPaymentBody(
  amount: number,
  currency: string,
  paidBy: string,
  splitType: BillPaymentSplit,
  ids: string[],
  values: Record<string, string>,
): { error: string; body?: BillPaymentRequest } {
  if (!paidBy || !ids.length || new Set(ids).size !== ids.length)
    return { error: "Choose a payer and at least one unique participant." };
  const effective =
    splitType === "SHARES"
      ? Object.fromEntries(ids.map((id) => [id, values[id] ?? "1"]))
      : values;
  const preview = splitPreview(
    String(amount),
    splitType,
    ids,
    effective,
    currency,
  );
  if (!preview?.complete)
    return {
      error:
        splitType === "SHARES"
          ? "Enter positive whole-number shares for every member."
          : splitType === "PERCENTAGE"
            ? "Percentages must be valid and add up to 100%."
            : "Member amounts must be valid and match the bill total.",
    };
  const common = { paidBy };
  if (splitType === "EQUAL")
    return {
      error: "",
      body: {
        ...common,
        splitType,
        participants: ids.map((userId) => ({ userId })),
      },
    };
  if (splitType === "SHARES")
    return {
      error: "",
      body: {
        ...common,
        splitType,
        participants: ids.map((userId) => ({
          userId,
          shares: parseShareWeight(effective[userId])!,
        })),
      },
    };
  if (splitType === "EXACT")
    return {
      error: "",
      body: {
        ...common,
        splitType,
        participants: ids.map((userId) => ({
          userId,
          amount: Number((values[userId] ?? "").trim().replace(",", ".")),
        })),
      },
    };
  return {
    error: "",
    body: {
      ...common,
      splitType,
      participants: ids.map((userId) => ({
        userId,
        percentage: Number((values[userId] ?? "").trim().replace(",", ".")),
      })),
    },
  };
}
