import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import type { BillReminders as ReminderData } from "../types";

const sections = [
  { key: "overdue", label: "Overdue", empty: "No overdue bills", icon: "alert-circle-outline" },
  { key: "dueToday", label: "Today", empty: "No bills due today", icon: "time-outline" },
  { key: "dueSoon", label: "Next 7 days", empty: "No bills due in the next seven days", icon: "calendar-outline" },
] as const;

type Props = {
  reminders: ReminderData;
  currency?: string;
  formatAmount: (amount: number) => string;
  onOpenBill: (billId: string) => void;
  onViewBills: () => void;
};

export default function BillReminders({ reminders, currency, formatAmount, onOpenBill, onViewBills }: Props) {
  const { colors, statusColors, surfaces } = useTheme();
  const [selected, setSelected] = useState<(typeof sections)[number]["key"] | null>(null);
  const activeKey = selected ?? sections.find(section => reminders[section.key].count > 0)?.key ?? "dueToday";
  const section = sections.find(item => item.key === activeKey)!;
  const group = reminders[activeKey];
  const palette = statusColors[activeKey === "overdue" ? "OVERDUE" : "PENDING"];
  const amount = (value: number) => `${currency ? `${currency} ` : ""}${formatAmount(value)}`;
  const total = sections.reduce((sum, item) => sum + reminders[item.key].count, 0);

  return (
    <View className="gap-4 rounded-[24px] bg-card p-5" style={surfaces.card}>
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-1">
          <Text accessibilityRole="header" className="text-lg font-semibold">Bill reminders</Text>
          <Text className="text-xs text-muted-foreground">{total === 0 ? "You're all caught up" : "Keep track of what needs paying"}</Text>
        </View>
        <Ionicons name="notifications-outline" size={22} color={colors.primary} accessible={false} />
      </View>
      <View className="flex-row flex-wrap gap-2">
        {sections.map(item => {
          const active = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${item.label}, ${reminders[item.key].count} bills`}
              onPress={() => setSelected(item.key)}
              className="min-h-12 flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 active:opacity-70"
              style={{ minWidth: 76, backgroundColor: active ? palette.background : colors.muted }}
            >
              <Text className="text-xs font-semibold" style={{ color: active ? palette.foreground : colors.mutedForeground }}>{item.label}</Text>
              <Text className="text-sm font-semibold" style={{ color: active ? palette.foreground : colors.foreground }}>{reminders[item.key].count}</Text>
            </Pressable>
          );
        })}
      </View>
      {group.count > 0 ? (
        <>
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-sm font-semibold" style={{ color: palette.foreground }}>{section.label}</Text>
            <Text className="text-sm font-semibold">{amount(group.amount)}</Text>
          </View>
          <View>
            {group.bills.map((bill, index) => (
              <Pressable
                key={bill._id}
                accessibilityRole="button"
                accessibilityLabel={`Review payment for ${bill.name}, ${amount(bill.amount)}`}
                onPress={() => onOpenBill(bill._id)}
                className={`min-h-14 flex-row items-center gap-3 py-3 active:opacity-60 ${index ? "border-t border-border" : ""}`}
              >
                <Ionicons name={section.icon} size={20} color={palette.foreground} accessible={false} />
                <View className="min-w-0 flex-1 gap-1">
                  <Text numberOfLines={2} className="text-sm font-semibold">{bill.name}</Text>
                  <Text className="text-xs text-muted-foreground">
                    Due {new Date(bill.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                  </Text>
                  <Text className="text-sm">{amount(bill.amount)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.mutedForeground} accessible={false} />
              </Pressable>
            ))}
          </View>
          {group.count > group.bills.length ? <Text className="text-xs text-muted-foreground">Showing {group.bills.length} of {group.count} bills. Open all bills to see more.</Text> : null}
        </>
      ) : (
        <View className="items-center gap-2 rounded-2xl bg-muted px-4 py-5">
          <Ionicons name="checkmark-circle-outline" size={26} color={colors.primary} accessible={false} />
          <Text className="text-center text-sm font-semibold">{section.empty}</Text>
        </View>
      )}
      <Text className="text-xs text-muted-foreground">Dates follow UTC. Next 7 days starts tomorrow.</Text>
      <Button variant="outline" onPress={onViewBills}><Text>All bills</Text></Button>
    </View>
  );
}
