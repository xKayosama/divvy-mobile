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

export function validateBillFields(
  name: string,
  amount: string,
  dueDate: string,
): Partial<Record<"name" | "amount" | "dueDate", string>> {
  const errors: Partial<Record<"name" | "amount" | "dueDate", string>> = {};
  if (!name.trim()) errors.name = "Enter a bill name.";
  if (
    !/^\d+(\.\d{1,2})?$/.test(amount) ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0 ||
    !Number.isSafeInteger(Math.round(Number(amount) * 100))
  )
    errors.amount = "Enter an amount greater than zero, with up to two decimals.";
  const parsed = new Date(`${dueDate}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== dueDate
  )
    errors.dueDate = "Enter a valid due date in YYYY-MM-DD format.";
  return errors;
}

export function validateBillForm(name: string, amount: string, dueDate: string): string {
  return Object.values(validateBillFields(name, amount, dueDate))[0] ?? "";
}
