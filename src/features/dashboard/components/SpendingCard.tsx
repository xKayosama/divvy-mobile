import { Text } from "@/components/ui/text";
import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

type Props = {
  amount: string;
  currency?: string;
};

export default function SpendingCard({ amount, currency }: Props) {
  return (
    <View className="gap-5 rounded-[28px] bg-primary p-6">
      <View className="flex-row items-center justify-between gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
          <Ionicons
            name="wallet-outline"
            size={22}
            color="white"
            accessible={false}
          />
        </View>

        {currency ? (
          <View className="rounded-full bg-white/15 px-3 py-2">
            <Text className="text-xs font-semibold text-primary-foreground">
              {currency}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="gap-2">
        <Text className="text-sm text-primary-foreground">
          Total shared spending
        </Text>

        <Text className="text-4xl font-semibold tracking-tight text-primary-foreground">
          {amount}
        </Text>
      </View>

      <View className="flex-row items-center gap-2 border-t border-white/20 pt-4">
        <Ionicons
          name="time-outline"
          size={16}
          color="white"
          accessible={false}
        />
        <Text className="text-xs text-primary-foreground">
          All time · Recorded group expenses
        </Text>
      </View>
    </View>
  );
}