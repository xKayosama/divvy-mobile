import { ContentState, QueryErrorState } from "@/components/ui/content-state";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenBackground from "@/components/layout/ScreenBackground";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { tabContentBottomInset } from "@/constants/navigation";
import { useAppSelector } from "@/hooks/redux";
import { useTheme } from "@/theme/ThemeProvider";
import { useGetGroupMembersQuery, useGetMyGroupsQuery } from "../groupsApi";

export default function GroupScreen({ groupId }: { groupId: string }) {
  const { colors, surfaces } = useTheme();
  const insets = useSafeAreaInsets();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const { data: groups } = useGetMyGroupsQuery();
  const group = groups?.data.groups.find((item) => item.id === groupId);
  const { currentData, isFetching, isError, error, refetch } =
    useGetGroupMembersQuery(groupId, { refetchOnMountOrArgChange: true });
  const members = (currentData?.data.members ?? [])
    .filter((member) => member.status === "ACTIVE")
    .sort((a, b) => Number(b.role === "OWNER") - Number(a.role === "OWNER"));
  const isOwner =
    !isError &&
    members.some(
      (member) => member.userId?._id === userId && member.role === "OWNER",
    );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <ScreenBackground />
      <FlatList
        data={isError ? [] : members}
        keyExtractor={(member) => member._id}
        refreshing={isFetching}
        onRefresh={() => {
          if (!isFetching) void refetch();
        }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: tabContentBottomInset(insets.bottom),
          gap: 12,
          flexGrow: 1,
        }}
        scrollIndicatorInsets={{ bottom: tabContentBottomInset(insets.bottom) }}
        ListHeaderComponent={
          <View className="mb-3 gap-5">
            <View className="gap-2">
              <Text className="text-3xl font-semibold">Group</Text>
              <Text className="text-sm text-muted-foreground">
                Your people. Shared together.
              </Text>
            </View>
            <View
              className="gap-4 rounded-[24px] bg-card p-5"
              style={surfaces.card}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                  <Ionicons
                    name="people-outline"
                    size={24}
                    color={colors.primary}
                    accessible={false}
                  />
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-xl font-semibold">
                    {group?.name ?? "Your group"}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {group?.currency ?? "Shared expenses"}
                    {currentData && !isError
                      ? ` · ${members.length} ${members.length === 1 ? "member" : "members"}`
                      : ""}
                  </Text>
                </View>
              </View>
              {isOwner ? (
                <View className="gap-3">
                  <Button
                    onPress={() =>
                      router.push({
                        pathname: "/groups/[groupId]/members/add",
                        params: { groupId },
                      })
                    }
                  >
                    <Ionicons
                      name="person-add-outline"
                      size={18}
                      color={colors.primaryForeground}
                      accessible={false}
                    />
                    <Text>Add member</Text>
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() =>
                      router.push({
                        pathname: "/groups/[groupId]/settings",
                        params: { groupId },
                      })
                    }
                  >
                    <Ionicons
                      name="settings-outline"
                      size={18}
                      color={colors.foreground}
                      accessible={false}
                    />
                    <Text>Group settings</Text>
                  </Button>
                </View>
              ) : currentData && !isError ? (
                <Text className="text-sm text-muted-foreground">
                  Your group owner manages membership.
                </Text>
              ) : null}
            </View>
            <Text className="text-lg font-semibold">Members</Text>
            {isError ? (
              <QueryErrorState error={error} subject="Members" busy={isFetching} onRetry={() => void refetch()} onBack={() => router.navigate("/groups")} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isFetching ? (
            <ActivityIndicator
              color={colors.primary}
              accessibilityLabel="Loading members"
            />
          ) : !isError ? (
            <ContentState icon="people-outline" title="No active members" description="No members are available to display. Refresh to check for updates." actionLabel="Refresh members" onAction={() => void refetch()} busy={isFetching} />
          ) : null
        }
        renderItem={({ item }) => (
          <View
            className="flex-row items-center gap-3 rounded-2xl bg-card p-4"
            style={surfaces.card}
          >
            <UserAvatar
              firstName={item.userId?.firstName}
              lastName={item.userId?.lastName}
              imageUrl={item.userId?.avatar}
              size={44}
            />
            <View className="min-w-0 flex-1 gap-1">
              <Text className="font-semibold">
                {item.userId
                  ? `${item.userId.firstName} ${item.userId.lastName}`
                  : "Unavailable account"}
                {item.userId?._id === userId ? " (you)" : ""}
              </Text>
              {item.userId ? (
                <Text className="text-xs text-muted-foreground">
                  {item.userId.email}
                </Text>
              ) : null}
            </View>
            <View className="rounded-full bg-secondary px-3 py-1">
              <Text className="text-xs text-secondary-foreground">
                {item.role === "OWNER" ? "Owner" : "Member"}
              </Text>
            </View>
            {isOwner &&
            item.role === "MEMBER" &&
            item.userId &&
            item.userId._id !== userId ? (
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel={`Remove ${item.userId.firstName} ${item.userId.lastName}`}
                onPress={() =>
                  router.push({
                    pathname: "/groups/[groupId]/members/[userId]/remove",
                    params: { groupId, userId: item.userId!._id },
                  })
                }
              >
                <Ionicons
                  name="person-remove-outline"
                  size={20}
                  color={colors.destructive}
                  accessible={false}
                />
              </Button>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
