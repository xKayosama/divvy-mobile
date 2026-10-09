import { View } from "react-native";

import { Text } from "@/components/ui/text";
import type { MemberBalance } from "../types";

type Props = {
  balances: MemberBalance[];
  formatAmount: (amount: number) => string;
};

export default function MemberBalances({
  balances,
  formatAmount,
}: Props) {
  return (
    <View className="rounded-[24px] bg-card p-5">
      <Text className="mb-3 text-lg font-semibold">
        Who owes what
      </Text>

      {balances.length === 0 ? (
        <Text className="text-sm text-muted-foreground">
          No member balances yet.
        </Text>
      ) : (
        balances.map((balance, index) => {
          const net = Math.round(balance.net * 100) / 100;
          const receiving = net > 0;
          const owing = net < 0;

          const badgeStyle = receiving
            ? "bg-emerald-50"
            : owing
              ? "bg-amber-50"
              : "bg-muted";

          const textStyle = receiving
            ? "text-emerald-800"
            : owing
              ? "text-amber-800"
              : "text-muted-foreground";

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
                </View>
              </View>

              <View
                className={`self-start rounded-full px-3 py-2 ${badgeStyle}`}
              >
                <Text className={`text-xs font-medium ${textStyle}`}>
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