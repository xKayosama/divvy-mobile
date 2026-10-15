import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";

import { Brand } from "@/components/brand/Brand";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  groupName: string;
  currency?: string;
  onSwitchGroup: () => void;
};

export default function DashboardHeader({
  groupName,
  currency,
  onSwitchGroup,
}: Props) {
  const { colors, surfaces } = useTheme();
  return (
    <View className="gap-5">
      <View className="flex-row items-center justify-between">
        <Brand />

      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Switch group. Current group: ${groupName}`}
        onPress={onSwitchGroup}
        className="min-h-12 max-w-full flex-row items-center gap-3 self-start rounded-full border border-border bg-card px-4 py-3"
        style={{ boxShadow: surfaces.card.boxShadow }}
      >
        <Ionicons
          name="people-outline"
          size={18}
          color={colors.primary}
          accessible={false}
        />

        <Text
          numberOfLines={1}
          className="min-w-0 shrink text-sm font-semibold"
        >
          {groupName}
        </Text>

        {currency ? (
          <Text className="text-xs text-muted-foreground">
            {currency}
          </Text>
        ) : null}

        <Ionicons
          name="chevron-down"
          size={16}
          color={colors.mutedForeground}
          accessible={false}
        />
      </Pressable>

      <View className="gap-2">
        <Text className="text-xs font-semibold text-secondary-foreground" style={{ letterSpacing: 2 }}>
          YOUR SHARED FINANCES
        </Text>
        <Text className="text-3xl font-semibold tracking-tight">
          Overview
        </Text>
        <Text className="text-sm text-muted-foreground">
          Keep shared spending in sync.
        </Text>
      </View>
    </View>
  );
}
