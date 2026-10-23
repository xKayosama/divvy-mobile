import type { ExpenseFrequency } from "./types";

export const frequencyLabels: Record<ExpenseFrequency, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};
export function validateRecurrenceEnd(
  value: string,
  firstDate: string,
): string {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    return "Enter a valid end date.";
  return value < firstDate.slice(0, 10)
    ? "End date must be on or after the first expense date."
    : "";
}
export function scheduleDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
