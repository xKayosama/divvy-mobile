import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import type { BillCategory } from "./types";

export const billCategories: Record<
  BillCategory,
  ComponentProps<typeof Ionicons>["name"]
> = {
  RENT: "home-outline",
  ELECTRICITY: "flash-outline",
  WATER: "water-outline",
  INTERNET: "wifi-outline",
  PHONE: "call-outline",
  SUBSCRIPTION: "repeat-outline",
  INSURANCE: "shield-checkmark-outline",
  OTHER: "ellipsis-horizontal-circle-outline",
};

export function validateBillForm(
  name: string,
  amount: string,
  dueDate: string,
): string {
  if (!name.trim()) return "Enter a bill name.";
  if (
    !/^\d+(\.\d{1,2})?$/.test(amount) ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  )
    return "Enter an amount greater than zero, with up to two decimals.";
  const parsed = new Date(`${dueDate}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dueDate
  )
    return "Enter a valid due date in YYYY-MM-DD format.";
  return "";
}
