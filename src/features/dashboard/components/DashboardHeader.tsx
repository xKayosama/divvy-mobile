import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { Brand } from "@/components/brand/Brand";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";

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
  return (
    <View className="gap-6">
      <View className="flex-row items-center justify-between">
        <Brand />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push("/profile")}
          className="h-12 w-12 items-center justify-center rounded-full border border-border bg-card"
        >
          <Ionicons
            name="person-outline"
            size={22}
            color={colors.primary}
            accessible={false}
          />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Switch group. Current group: ${groupName}`}
        onPress={onSwitchGroup}
        className="min-h-12 max-w-full flex-row items-center gap-3 self-start rounded-full border border-border bg-card px-4 py-3"
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