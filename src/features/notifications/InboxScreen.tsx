import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ContentState, QueryErrorState } from "@/components/ui/content-state";
import { FormMessage } from "@/components/auth/FormField";
import { authError } from "@/features/auth/errors";
import { useAppSelector } from "@/hooks/redux";
import { useTheme } from "@/theme/ThemeProvider";
import { useInboxRefresh } from "./useInboxRefresh";
import { notificationRoute } from "./notificationRoute";
import { useGetInboxQuery, useReadAllNotificationsMutation, useReadNotificationMutation, type InboxNotification } from "./notificationsApi";

export default function InboxScreen() {
  const { colors, surfaces } = useTheme();
  const userId = useAppSelector(state => state.auth.user?.id);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const polling = useInboxRefresh();
  const query = useGetInboxQuery(page, { refetchOnMountOrArgChange: true, pollingInterval: polling ? 30000 : 0 });
  const { refetch } = query;
  useEffect(() => { if (polling) void refetch(); }, [polling, refetch]);
  const [read] = useReadNotificationMutation();
  const [readAll, readAllState] = useReadAllNotificationsMutation();
  const data = query.currentData?.data;
  const refresh = () => { if (page === 1) void query.refetch(); else setPage(1); };
  async function open(item: InboxNotification) {
    if (lock.current || !userId) return;
    lock.current = true; setMessage("");
    try {
      if (!item.readAt) await read(item.id).unwrap();
      if (item.type === "invitation") router.push("/invitations");
      else {
        const target = notificationRoute({ ...item, userId }, userId);
        if (target) router.push(target);
      }
    } catch (error) { setMessage(authError(error, "Could not open notification. Please try again.")); }
    finally { lock.current = false; }
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={query.isError ? [] : data?.notifications ?? []}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}
        refreshing={query.isFetching && !query.isLoading}
        onRefresh={refresh}
        ListHeaderComponent={<View className="mb-2 gap-4">
          <View className="flex-row items-center gap-3">
            <Button variant="outline" size="icon" accessibilityLabel="Back to groups" onPress={() => router.navigate("/groups")}>
              <Ionicons name="chevron-back" size={22} color={colors.foreground} accessible={false} />
            </Button>
            <Text accessibilityRole="header" className="flex-1 text-2xl font-semibold">Notifications</Text>
          </View>
          <Text className="text-sm text-muted-foreground">Bill reminders and group invitations, all in one place.</Text>
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-sm text-muted-foreground">{data ? `${data.unreadCount} unread` : ""}</Text>
            <Button variant="ghost" disabled={!data?.unreadCount || readAllState.isLoading} onPress={async () => {
              setMessage("");
              try { await readAll().unwrap(); } catch (error) { setMessage(authError(error, "Could not mark notifications as read.")); }
            }}><Text>{readAllState.isLoading ? "Updating…" : "Mark all read"}</Text></Button>
          </View>
          <FormMessage message={message} />
          {query.isError ? <QueryErrorState error={query.error} subject="Notifications" busy={query.isFetching} onRetry={() => void query.refetch()} /> : null}
        </View>}
        ListEmptyComponent={query.isLoading || (query.isFetching && !data) ? <ActivityIndicator accessibilityLabel="Loading notifications" color={colors.primary} /> : !query.isError ? <ContentState icon="notifications-outline" title="You’re all caught up" description="Your bill reminders and group invitations will appear here." /> : null}
        renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.readAt ? "" : "Unread. "}${item.title}. ${item.body}`} onPress={() => void open(item)} style={({ pressed }) => ({ ...surfaces.card, padding: 16, opacity: pressed ? 0.8 : 1, borderColor: item.readAt ? colors.border : colors.primary })}>
          <View className="flex-row items-start gap-3">
            <Ionicons name={item.type === "invitation" ? "mail-outline" : "calendar-outline"} size={24} color={colors.primary} accessible={false} />
            <View className="min-w-0 flex-1 gap-2">
              <View className="flex-row items-center gap-2"><Text className="flex-1 text-base font-semibold">{item.title}</Text>{!item.readAt ? <View className="h-2 w-2 rounded-full bg-primary" /> : null}</View>
              <Text className="text-sm leading-5 text-muted-foreground">{item.body}</Text>
              <Text className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          </View>
        </Pressable>}
        ListFooterComponent={data && data.pagination.totalPages > 1 ? <View className="mt-3 flex-row items-center justify-between gap-2">
          <Button variant="outline" disabled={page <= 1 || query.isFetching} onPress={() => setPage(value => value - 1)}><Text>Previous</Text></Button>
          <Text className="text-sm text-muted-foreground">{page} / {data.pagination.totalPages}</Text>
          <Button variant="outline" disabled={page >= data.pagination.totalPages || query.isFetching} onPress={() => setPage(value => value + 1)}><Text>Next</Text></Button>
        </View> : null}
      />
    </SafeAreaView>
  );
}
