import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";

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
  return (
    <View
      style={{ flexGrow: 1, flexBasis: 140 }}
      className="gap-4 rounded-[24px] border border-border bg-card p-4"
    >
      <View
        className={`h-10 w-10 items-center justify-center rounded-2xl ${
          overdue ? "bg-destructive/10" : "bg-secondary"
        }`}
      >
        <Ionicons
          name={overdue ? "alert-circle-outline" : "calendar-outline"}
          size={20}
          color={overdue ? colors.destructive : colors.primary}
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
        className={`text-xs ${
          overdue && count > 0
            ? "text-destructive"
            : "text-muted-foreground"
        }`}
      >
        {count} {count === 1 ? "bill" : "bills"}
        {overdue && count > 0 ? " · Needs attention" : ""}
      </Text>
    </View>
  );
}