import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform, View } from "react-native";

type Props = {
  amount: string;
  currency?: string;
};

export default function SpendingCard({ amount, currency }: Props) {
  const { brandGradients, colors } = useTheme();
  const gradient = `linear-gradient(45deg, ${brandGradients.spending.join(", ")})`;

  return (
    <View
      style={{
        borderRadius: 28,
        padding: 24,
        gap: 20,
        overflow: "hidden",
        backgroundColor: "#15533F",
        boxShadow: "0 8px 24px rgba(8,99,79,0.18)",
        ...Platform.select({
          web: { backgroundImage: gradient },
          default: { experimental_backgroundImage: gradient },
        }),
      }}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.accent }}
        >
          <Ionicons
            name="wallet-outline"
            size={22}
            color={colors.accentForeground}
            accessible={false}
          />
        </View>

        {currency ? (
          <View
            className="rounded-full px-3 py-2"
            style={{ backgroundColor: colors.secondary }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: colors.secondaryForeground }}
            >
              {currency}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="gap-2">
        <Text className="text-sm text-white">
          Total shared spending
        </Text>

        <Text className="text-4xl font-semibold tracking-tight text-white" style={{ fontVariant: ["tabular-nums"] }}>
          {amount}
        </Text>
      </View>

      <View className="flex-row items-center gap-2 border-t border-white/20 pt-4">
        <Ionicons
          name="time-outline"
          size={16}
          color={colors.accent}
          accessible={false}
        />
        <Text className="text-xs text-white">
          All time · Recorded group expenses
        </Text>
      </View>
    </View>
  );
}
