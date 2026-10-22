import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import type { ExpenseCategory } from "./types";

export const categoryIcons: Record<
  ExpenseCategory,
  ComponentProps<typeof Ionicons>["name"]
> = {
  GROCERIES: "cart-outline",
  FOOD: "restaurant-outline",
  RENT: "home-outline",
  UTILITIES: "flash-outline",
  INTERNET: "wifi-outline",
  TRANSPORTATION: "bus-outline",
  HEALTHCARE: "medkit-outline",
  ENTERTAINMENT: "film-outline",
  SHOPPING: "bag-handle-outline",
  OTHERS: "ellipsis-horizontal-circle-outline",
};


export const expenseCategoryOptions = (Object.keys(categoryIcons) as ExpenseCategory[]).map(value => ({
  value,
  label: value === "OTHERS" ? "Other" : value.charAt(0) + value.slice(1).toLowerCase(),
  icon: categoryIcons[value],
}));
