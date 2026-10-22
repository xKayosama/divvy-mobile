import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

export const groupIcons = [
  { value: "people", label: "People", glyph: "people-outline" },
  { value: "home", label: "Home", glyph: "home-outline" },
  { value: "heart", label: "Family", glyph: "heart-outline" },
  { value: "airplane", label: "Travel", glyph: "airplane-outline" },
  { value: "car", label: "Car", glyph: "car-outline" },
  { value: "restaurant", label: "Food", glyph: "restaurant-outline" },
  { value: "cafe", label: "Coffee", glyph: "cafe-outline" },
  { value: "briefcase", label: "Work", glyph: "briefcase-outline" },
  { value: "school", label: "Study", glyph: "school-outline" },
  { value: "game-controller", label: "Games", glyph: "game-controller-outline" },
  { value: "football", label: "Sports", glyph: "football-outline" },
  { value: "paw", label: "Pets", glyph: "paw-outline" },
] as const satisfies readonly { value: string; label: string; glyph: ComponentProps<typeof Ionicons>["name"] }[];

export type GroupIcon = (typeof groupIcons)[number]["value"];
export const defaultGroupIcon: GroupIcon = "people";
export function resolveGroupIcon(value?: string | null) {
  return groupIcons.find(icon => icon.value === value) ?? groupIcons[0];
}
