import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import type { UpcomingBill } from "../types";

type Props = {
  bills: UpcomingBill[];
  formatAmount: (amount: number) => string;
};

const recurrenceLabels = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export default function UpcomingBills({
  bills,
  formatAmount,
}: Props) {
  return (
    <View className="rounded-[24px] bg-card p-5">
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-lg font-semibold">Coming up</Text>

        <View className="rounded-full bg-secondary px-3 py-1">
          <Text className="text-xs font-semibold text-secondary-foreground">
            {bills.length}
          </Text>
        </View>
      </View>

      {bills.length === 0 ? (
        <View className="items-center gap-3 rounded-2xl bg-muted px-5 py-6">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-card">
            <Ionicons
              name="calendar-outline"
              size={24}
              color={colors.mutedForeground}
              accessible={false}
            />
          </View>

          <Text className="font-semibold">Nothing coming up</Text>

          <Text className="text-center text-sm text-muted-foreground">
            Your upcoming pending bills will appear here.
          </Text>
        </View>
      ) : (
        bills.map((bill, index) => (
          <View
            key={bill._id}
            className={`gap-3 py-4 ${
              index > 0 ? "border-t border-border" : ""
            }`}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
                <Ionicons
                  name="calendar-outline"
                  size={21}
                  color={colors.primary}
                  accessible={false}
                />
              </View>

              <View className="min-w-0 flex-1 gap-1">
                <Text className="font-semibold">{bill.name}</Text>

                <Text className="text-xs text-muted-foreground">
                  {new Date(bill.dueDate).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <View className="flex-row flex-wrap items-center gap-2">
                <View className="rounded-full bg-amber-50 px-3 py-1">
                  <Text className="text-xs font-medium text-amber-800">
                    Pending
                  </Text>
                </View>

                {bill.isRecurring && bill.recurrence ? (
                  <Text className="text-xs text-muted-foreground">
                    {recurrenceLabels[bill.recurrence]}
                  </Text>
                ) : null}
              </View>

              <Text className="text-base font-semibold">
                {formatAmount(bill.amount)}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}