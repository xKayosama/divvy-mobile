import { formatCurrencyAmount } from "@/features/groups/money";
import type { SpendingComparison } from "./types";

export function spendingComparisonText(comparison: SpendingComparison | null | undefined, currency?: string) {
  if (!comparison) return null;
  const month = new Date(`${comparison.previous.startDate}T00:00:00Z`).toLocaleDateString("en-PH", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
  const money = (value: number) => `${currency ? `${currency} ` : ""}${formatCurrencyAmount(Math.abs(value), currency)}`;
  const headline = comparison.direction === "unchanged"
    ? `No change from ${month}`
    : `${money(comparison.difference)} ${comparison.direction === "increase" ? "more" : "less"} than ${month}`;
  let detail = `${month}: ${money(comparison.previous.amount)}`;
  if (comparison.percentageChange === null) {
    detail += " · No prior spending to compare by percentage";
  } else {
    const absolute = Math.abs(comparison.percentageChange);
    const percentage = absolute < 0.01 && comparison.difference !== 0
      ? "<0.01"
      : new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(absolute);
    detail += ` · ${percentage}% ${comparison.direction === "increase" ? "increase" : comparison.direction === "decrease" ? "decrease" : "change"}`;
  }
  return {
    headline,
    detail,
    context: comparison.current.isInProgress ? "Full UTC months · Current month still in progress" : "Full UTC calendar months",
  };
}
