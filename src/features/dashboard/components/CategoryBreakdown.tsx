import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { categoryIcons } from "@/features/expenses/categoryIcons";
import { useTheme } from "@/theme/ThemeProvider";
import type { SpendingCategory } from "../types";

type Props = {
  categories: SpendingCategory[];
  periodLabel: string;
  currency?: string;
  formatAmount: (amount: number) => string;
  onOpenCategory: (category: SpendingCategory["category"]) => void;
};

export default function CategoryBreakdown({ categories, periodLabel, currency, formatAmount, onOpenCategory }: Props) {
  const { colors, surfaces } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? categories : categories.slice(0, 3);

  return (
    <View className="gap-4 rounded-[24px] bg-card p-5" style={surfaces.card}>
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-1">
          <Text accessibilityRole="header" className="text-lg font-semibold">Spending by category</Text>
          <Text className="text-xs text-muted-foreground">{periodLabel} · Recorded expenses</Text>
        </View>
        <Ionicons name="pie-chart-outline" size={22} color={colors.primary} accessible={false} />
      </View>
      {categories.length === 0 ? (
        <View className="items-center gap-2 rounded-2xl bg-muted px-4 py-5">
          <Ionicons name="receipt-outline" size={26} color={colors.mutedForeground} accessible={false} />
          <Text className="text-center text-sm font-semibold">No spending in this period</Text>
          <Text className="text-center text-xs text-muted-foreground">Recorded expenses will appear here by category.</Text>
        </View>
      ) : (
        <View className="gap-4">
          {visible.map(item => {
            const label = item.category.charAt(0) + item.category.slice(1).toLowerCase().replace(/_/g, " ");
            const percentage = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 2 }).format(item.percentage);
            return (
              <Pressable
                key={item.category}
                accessibilityRole="button"
                accessibilityLabel={`View ${label.toLowerCase()} expenses, ${periodLabel.toLowerCase()}`}
                onPress={() => onOpenCategory(item.category)}
                className="min-h-12 gap-2 rounded-xl active:opacity-60"
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-xl bg-secondary">
                    <Ionicons name={categoryIcons[item.category] ?? categoryIcons.OTHERS} size={18} color={colors.primary} accessible={false} />
                  </View>
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-sm font-semibold">{label}</Text>
                    <Text className="text-xs text-muted-foreground">{item.count} {item.count === 1 ? "expense" : "expenses"} · {percentage}%</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} accessible={false} />
                </View>
                <View className="ml-12 gap-2">
                  <Text className="text-sm font-semibold" style={{ fontVariant: ["tabular-nums"] }}>{currency ? `${currency} ` : ""}{formatAmount(item.amount)}</Text>
                  <View
                    accessibilityRole="progressbar"
                    accessibilityLabel={`${label} share of spending`}
                    accessibilityValue={{ min: 0, max: 100, now: item.percentage, text: `${percentage}%` }}
                    className="h-1.5 overflow-hidden rounded-full bg-secondary"
                  >
                    <View style={{ height: "100%", width: `${Math.max(0, Math.min(100, item.percentage))}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
      {categories.length > 3 ? (
        <Button variant="ghost" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}>
          <Text>{expanded ? "Show less" : `Show all ${categories.length} categories`}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.foreground} accessible={false} />
        </Button>
      ) : null}
    </View>
  );
}
