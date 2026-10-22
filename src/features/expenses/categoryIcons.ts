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
  COFFEE: "cafe-outline",
  TRAVEL: "airplane-outline",
  ACCOMMODATION: "bed-outline",
  FUEL: "speedometer-outline",
  PARKING: "car-outline",
  EDUCATION: "school-outline",
  PETS: "paw-outline",
  GIFTS: "gift-outline",
  HOME_MAINTENANCE: "hammer-outline",
  PERSONAL_CARE: "cut-outline",
  FITNESS: "barbell-outline",
  SUBSCRIPTIONS: "repeat-outline",
  OTHERS: "ellipsis-horizontal-circle-outline",
};


export const expenseCategoryOptions = (Object.keys(categoryIcons) as ExpenseCategory[]).map(value => ({
  value,
  label: value === "OTHERS" ? "Other" : value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " "),
  icon: categoryIcons[value],
}));
