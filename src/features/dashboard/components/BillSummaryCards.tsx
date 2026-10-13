import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  pendingAmount: string;
  pendingCount: number;
  overdueAmount: string;
  overdueCount: number;
};

export default function BillSummaryCards({
  pendingAmount,
  pendingCount,
  overdueAmount,
  overdueCount,
}: Props) {
  return (
    <View className="flex-row flex-wrap gap-3">
      <BillCard
        title="Pending bills"
        amount={pendingAmount}
        count={pendingCount}
        overdue={false}
      />
      <BillCard
        title="Overdue bills"
        amount={overdueAmount}
        count={overdueCount}
        overdue
      />
    </View>
  );
}

function BillCard({
  title,
  amount,
  count,
  overdue,
}: {
  title: string;
  amount: string;
  count: number;
  overdue: boolean;
}) {
  const { colors, statusColors, surfaces } = useTheme();
  const palette = statusColors[overdue ? "OVERDUE" : "PENDING"];

  return (
    <View
      style={{ ...surfaces.card, flexGrow: 1, flexBasis: 140 }}
      className="gap-4 rounded-[24px] border border-border bg-card p-4"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-2xl"
        style={{ backgroundColor: palette.background }}
      >
        <Ionicons
          name={overdue ? "alert-circle-outline" : "calendar-outline"}
          size={20}
          color={palette.foreground}
          accessible={false}
        />
      </View>

      <View className="gap-1">
        <Text className="text-xs text-muted-foreground">{title}</Text>
        <Text className="text-2xl font-semibold tracking-tight">
          {amount}
        </Text>
      </View>

      <Text
        className="text-xs"
        style={{ color: count > 0 ? palette.foreground : colors.mutedForeground }}
      >
        {count} {count === 1 ? "bill" : "bills"}
        {overdue && count > 0 ? " · Needs attention" : ""}
      </Text>
    </View>
  );
}
