import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import { useInboxRefresh } from "./useInboxRefresh";
import { useGetUnreadCountQuery } from "./notificationsApi";

export function InboxBell() {
  const { colors } = useTheme();
  const polling = useInboxRefresh();
  const { currentData, isError, refetch } = useGetUnreadCountQuery(undefined, { pollingInterval: polling ? 30000 : 0 });
  useEffect(() => { if (polling) void refetch(); }, [polling, refetch]);
  const count = currentData?.data.unreadCount ?? 0;
  return (
    <View>
      <Button variant="outline" size="icon" accessibilityLabel={`Notifications${isError ? ", unread count unavailable" : `, ${count} unread`}`} onPress={() => router.push("/notifications")}>
        <Ionicons name="notifications-outline" size={22} color={colors.foreground} accessible={false} />
      </Button>
      {count > 0 ? <View pointerEvents="none" accessible={false} className="absolute -right-1 -top-1 min-w-5 items-center justify-center rounded-full bg-primary px-1 py-0.5">
        <Text className="text-[10px] font-semibold text-primary-foreground">{count > 99 ? "99+" : count}</Text>
      </View> : null}
    </View>
  );
}
