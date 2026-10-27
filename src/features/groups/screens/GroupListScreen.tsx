import { resolveGroupIcon } from "../groupIcons";
import { ContentState, QueryErrorState } from "@/components/ui/content-state";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useGetInvitationsQuery } from "../invitationsApi";
import { ActivityIndicator, FlatList, Pressable, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { InboxBell } from "@/features/notifications/InboxBell";
import { Brand } from "@/components/brand/Brand";
import ScreenBackground from "@/components/layout/ScreenBackground";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import { useGetMyGroupsQuery } from "../groupsApi";

export default function GroupListScreen() {
  const { colors, surfaces } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Reserve the list padding, three 48px buttons, their spacing, and the logo gap.
  const logoWidth = Math.min(152, Math.max(0, width - insets.left - insets.right - 40 - 160 - 12));
  const { data, isLoading, isFetching, isError, error, refetch } = useGetMyGroupsQuery();

  const incoming = useGetInvitationsQuery(undefined, { refetchOnMountOrArgChange: true, pollingInterval: 30000 });
  const { refetch: refreshInvitations } = incoming;
  const invitationCount = incoming.currentData?.data.invitations.length ?? 0;
  useFocusEffect(useCallback(() => { void refetch(); void refreshInvitations(); }, [refetch, refreshInvitations]));

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-background">
      <ScreenBackground />
      <FlatList
        data={isError ? [] : data?.data.groups ?? []}
        keyExtractor={(group) => group.id}
        showsVerticalScrollIndicator={false}
        refreshing={isFetching && !isLoading}
        onRefresh={() => { if (!isFetching) void refetch(); }}
        contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom, 20) + 20, flexGrow: 1 }}
        ListHeaderComponent={
          <View className="mb-6 gap-6">
            <View className="flex-row items-center justify-between gap-3">
              <Brand width={logoWidth} />
              <View className="ml-auto flex-row items-center gap-2" style={{ flexShrink: 0 }}>
                <View>
                  <Button variant="outline" size="icon" accessibilityLabel={`Invitations${invitationCount ? `, ${invitationCount} pending` : ""}`} onPress={() => router.push("/invitations")}>
                    <Ionicons name="mail-outline" size={22} color={colors.primary} accessible={false} />
                  </Button>
                  {invitationCount > 0 ? (
                    <View pointerEvents="none" accessible={false} className="absolute -right-1 -top-1 min-w-5 items-center justify-center rounded-full bg-primary px-1 py-0.5">
                      <Text className="text-[10px] font-semibold text-primary-foreground">{invitationCount > 99 ? "99+" : invitationCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Button variant="outline" size="icon" accessibilityLabel="Deleted groups" onPress={() => router.push("/groups/deleted")}>
                  <Ionicons name="archive-outline" size={22} color={colors.primary} accessible={false} />
                </Button>
                <Button variant="outline" size="icon" accessibilityLabel="Open profile" onPress={() => router.push("/profile")}>
                  <Ionicons name="person-outline" size={22} color={colors.foreground} accessible={false} />
                </Button>
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-xs font-semibold text-secondary-foreground" style={{ letterSpacing: 2 }}>SHARED SPACES</Text>
              <View className="flex-row items-center justify-between gap-3">
                <Text className="min-w-0 flex-1 text-3xl font-semibold tracking-tight">Your groups</Text>
                <InboxBell />
              </View>
              <Text className="text-sm text-muted-foreground">Choose a group to manage your shared spending.</Text>
            </View>
            <Button className="h-14 rounded-2xl" onPress={() => router.push("/groups/create")}>
              <Ionicons name="add" size={22} color={colors.primaryForeground} accessible={false} />
              <Text className="font-semibold">Create group</Text>
            </Button>
            {isError ? (
              <QueryErrorState error={error} subject="Groups" busy={isFetching} onRetry={() => void refetch()} />
            ) : data ? <Text className="text-xs text-muted-foreground">{data.data.groups.length} {data.data.groups.length === 1 ? "group" : "groups"}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center gap-3 py-10"><ActivityIndicator color={colors.primary} /><Text>Loading your groups…</Text></View>
          ) : !isError ? (
            <ContentState icon="people-outline" title="A space for shared spending" description="Create your first group for your household, friends, or next trip." actionLabel="Create group" onAction={() => router.push("/groups/create")} />
          ) : null
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.name}`}
            style={({ pressed }) => ({ ...surfaces.card, padding: 20, opacity: pressed ? 0.8 : 1 })}
            onPress={() => router.push({ pathname: "/groups/[groupId]/home", params: { groupId: item.id } })}
          >
            <View className="flex-row items-center gap-4">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                <Ionicons name={resolveGroupIcon(item.icon).glyph} size={24} color={colors.primary} accessible={false} />
              </View>
              <View className="min-w-0 flex-1 gap-2">
                <Text className="text-lg font-semibold">{item.name}</Text>
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-xs text-muted-foreground">{item.currency}</Text>
                  <View className="rounded-full bg-secondary px-2 py-1">
                    <Text className="text-xs font-medium text-secondary-foreground">{item.role.charAt(0) + item.role.slice(1).toLowerCase()}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} accessible={false} />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
