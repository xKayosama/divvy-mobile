import { Button } from "@/components/ui/button";
import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import type { MemberBalance } from "../types";

type Props = {
  balances: MemberBalance[];
  formatAmount: (amount: number) => string;
  onSettleUp: () => void;
};

export default function MemberBalances({
  balances,
  formatAmount,
  onSettleUp,
}: Props) {
  const { colors, statusColors, surfaces } = useTheme();
  return (
    <View className="rounded-[24px] bg-card p-5" style={surfaces.card}>
      <Text className="mb-3 text-lg font-semibold">Who owes what</Text>

      <Button variant="outline" className="mb-3" onPress={onSettleUp}>
        <Ionicons
          name="swap-horizontal-outline"
          size={18}
          color={colors.primary}
          accessible={false}
        />
        <Text>Settle up · View payments</Text>
      </Button>
      {balances.length === 0 ? (
        <Text className="text-sm text-muted-foreground">
          No member balances yet.
        </Text>
      ) : (
        balances.map((balance, index) => {
          const net = Math.round(balance.net * 100) / 100;
          const receiving = net > 0;
          const owing = net < 0;

          const palette = receiving
            ? statusColors.PAID
            : owing
              ? statusColors.PENDING
              : {
                  background: colors.muted,
                  foreground: colors.mutedForeground,
                };

          const label = receiving
            ? `To receive: ${formatAmount(net)}`
            : owing
              ? `Owes: ${formatAmount(Math.abs(net))}`
              : "Settled up";

          return (
            <View
              key={balance.user._id}
              className={`gap-3 py-4 ${
                index > 0 ? "border-t border-border" : ""
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-secondary">
                  <Text className="font-semibold text-secondary-foreground">
                    {balance.user.firstName.charAt(0)}
                    {balance.user.lastName.charAt(0)}
                  </Text>
                </View>

                <View className="min-w-0 flex-1 gap-1">
                  <Text className="font-semibold">
                    {balance.user.firstName} {balance.user.lastName}
                  </Text>

                  <Text className="text-xs text-muted-foreground">
                    Paid {formatAmount(balance.paid)} · Share{" "}
                    {formatAmount(balance.owed)}
                  </Text>
                  {(balance.settlementPaid ?? 0) > 0 ||
                  (balance.settlementReceived ?? 0) > 0 ? (
                    <Text className="text-xs text-muted-foreground">
                      Repaid {formatAmount(balance.settlementPaid ?? 0)} ·
                      Received {formatAmount(balance.settlementReceived ?? 0)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View
                className="self-start rounded-full px-3 py-2"
                style={{ backgroundColor: palette.background }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: palette.foreground }}
                >
                  {label}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
