import { resolveGroupIcon } from "@/features/groups/groupIcons";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Brand } from "@/components/brand/Brand";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  groupName: string;
  currency?: string;
  groupIcon?: string;
  onSwitchGroup: () => void;
  onOpenProfile: () => void;
};

export default function DashboardHeader({
  groupName,
  groupIcon,
  currency,
  onSwitchGroup,
  onOpenProfile,
}: Props) {
  const { colors, surfaces } = useTheme();
  return (
    <View className="gap-5">
      <View className="flex-row items-center justify-between">
        <Brand />
        <Button
          variant="outline"
          size="icon"
          accessibilityLabel="Open profile"
          onPress={onOpenProfile}
        >
          <Ionicons name="person-outline" size={22} color={colors.foreground} accessible={false} />
        </Button>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Switch group. Current group: ${groupName}`}
        onPress={onSwitchGroup}
        className="min-h-12 max-w-full flex-row items-center gap-3 self-start rounded-full border border-border bg-card px-4 py-3"
        style={{ boxShadow: surfaces.card.boxShadow }}
      >
        <Ionicons
          name={resolveGroupIcon(groupIcon).glyph}
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
