import { formatCurrencyAmount } from "@/features/groups/money";
import type { ActivityAction } from "./types";
export const actionLabels: Record<ActivityAction, string> = {
  EXPENSE_ADDED: "added an expense",
  EXPENSE_EDITED: "edited an expense",
  EXPENSE_DELETED: "deleted an expense",
  BILL_PAID: "recorded a bill payment",
  GROUP_UPDATED: "changed group settings",
};
export const fieldLabels: Record<string, string> = {
  paused: "Schedule paused",
  endDate: "Schedule end date",
  description: "Description",
  amount: "Amount",
  category: "Category",
  date: "Expense date",
  notes: "Notes",
  paidBy: "Paid by",
  splitType: "Split method",
  participants: "Member splits",
  items: "Items and assignments",
  adjustments: "Tax and tip",
  name: "Group name",
  currency: "Currency",
  icon: "Group icon",
};
const choices: Record<string, string> = {
  EQUAL: "Equally",
  EXACT: "By amount",
  PERCENTAGE: "By percentage",
  SHARES: "By shares",
  ITEMIZED: "Itemized",
  PROPORTIONAL: "By item amounts",
};
export function activityValue(
  value: unknown,
  field: string,
  currency: string,
  names: Record<string, string> = {},
): string {
  if (value == null || value === "") return "None";
  if (field === "amount" && typeof value === "number")
    return `${currency} ${formatCurrencyAmount(value, currency)}`;
  if (field === "paidBy") return names[String(value)] || "Unavailable member";
  if (field === "paused") return value ? "Yes" : "No";
  if (field === "endDate")
    return new Date(String(value)).toLocaleDateString(undefined, {
      timeZone: "UTC",
    });
  if (field === "date") {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString();
  }
  if (Array.isArray(value))
    return (
      value
        .map((entry) => {
          if (!entry || typeof entry !== "object") return String(entry);
          const item = entry as Record<string, unknown>;
          if (field === "participants")
            return `${names[String(item.userId)] || "Unavailable member"}: ${activityValue(item.amount, "amount", currency, names)}${item.shares ? ` (${item.shares} shares)` : item.percentage != null ? ` (${item.percentage}%)` : ""}`;
          return `${item.description || "Item"} × ${item.quantity ?? 1}: ${activityValue(item.amount, "amount", currency, names)} · ${(Array.isArray(item.memberIds) ? item.memberIds : []).map((id) => names[String(id)] || "Unavailable member").join(", ")}`;
        })
        .join("\n") || "None"
    );
  if (typeof value === "object")
    return (
      Object.entries(value)
        .map(([key, entry]) => {
          if (entry && typeof entry === "object" && "amount" in entry) {
            const charge = entry as { amount: number; allocation: string };
            return `${key}: ${activityValue(charge.amount, "amount", currency, names)} · ${choices[charge.allocation] || charge.allocation}`;
          }
          return `${key}: ${String(entry)}`;
        })
        .join("\n") || "None"
    );
  return choices[String(value)] || String(value).replaceAll("_", " ");
}
