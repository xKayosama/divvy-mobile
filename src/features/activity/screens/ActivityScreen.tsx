import { useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ContentState, QueryErrorState } from "@/components/ui/content-state";
import { useTheme } from "@/theme/ThemeProvider";
import { useGetGroupActivityQuery } from "../activityApi";
import {
  useGetGroupMembersQuery,
  useGetMyGroupsQuery,
} from "@/features/groups/groupsApi";
import { actionLabels, activityValue, fieldLabels } from "../format";
import type { GroupActivity } from "../types";
const icons: Record<
  GroupActivity["action"],
  React.ComponentProps<typeof Ionicons>["name"]
> = {
  EXPENSE_ADDED: "add-circle-outline",
  EXPENSE_EDITED: "create-outline",
  EXPENSE_DELETED: "trash-outline",
  BILL_PAID: "checkmark-circle-outline",
  GROUP_UPDATED: "settings-outline",
};
export default function ActivityScreen({ groupId }: { groupId: string }) {
  const { colors } = useTheme();
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { currentData, isFetching, isError, error, refetch } =
    useGetGroupActivityQuery(
      { groupId, page },
      { refetchOnMountOrArgChange: true },
    );
  const { data: groups } = useGetMyGroupsQuery();
  const { data: members } = useGetGroupMembersQuery(groupId);
  const currency =
    groups?.data.groups.find((g) => g.id === groupId)?.currency || "PHP";
  const names: Record<string, string> = {};
  members?.data.members.forEach((m) => {
    if (m.userId)
      names[m.userId._id] =
        [m.userId.firstName, m.userId.lastName].filter(Boolean).join(" ") ||
        "Unnamed member";
  });
  const pagination = currentData?.data.pagination;
  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        key={page}
        data={isError ? [] : (currentData?.data.activities ?? [])}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 20, gap: 12, flexGrow: 1 }}
        refreshing={isFetching}
        onRefresh={() => void refetch()}
        ListHeaderComponent={
          <View className="gap-4 pb-2">
            <Button
              variant="outline"
              onPress={() =>
                router.navigate({
                  pathname: "/(app)/groups/[groupId]/(tabs)/group",
                  params: { groupId },
                })
              }
            >
              <Text>Back to group</Text>
            </Button>
            <Text accessibilityRole="header" className="text-3xl font-semibold">
              Activity history
            </Text>
            <Text className="text-sm text-muted-foreground">
              Who changed what, newest first. History starts when this feature
              is enabled.
            </Text>
            {isError ? (
              <QueryErrorState
                error={error}
                subject="Activity history"
                busy={isFetching}
                onRetry={() => void refetch()}
                onBack={() => router.back()}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isFetching ? (
            <ActivityIndicator
              color={colors.primary}
              accessibilityLabel="Loading activity"
            />
          ) : !isError ? (
            <ContentState
              icon="time-outline"
              title="No activity yet"
              description="New expenses, expense edits and deletions, bill payments, and group setting changes will appear here."
            />
          ) : null
        }
        renderItem={({ item }) => {
          const actor = item.actor
            ? [item.actor.firstName, item.actor.lastName]
                .filter(Boolean)
                .join(" ") || "Unnamed member"
            : item.snapshot?.automatic
              ? "System"
              : "Unavailable account";
          const changes = Object.entries(item.changes ?? {});
          const recordCurrency = item.snapshot?.currency || currency;
          return (
            <View className="gap-3 rounded-2xl bg-card p-4">
              <View className="flex-row items-start gap-3">
                <Ionicons
                  name={icons[item.action] || "time-outline"}
                  size={24}
                  color={colors.primary}
                  accessible={false}
                />
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="font-semibold">
                    {actor} {actionLabels[item.action] || "updated the group"}
                  </Text>
                  <Text numberOfLines={expanded[item._id] ? undefined : 3}>
                    {item.label}
                  </Text>
                  {item.snapshot?.amount != null ? (
                    <Text>
                      {activityValue(
                        item.snapshot.amount,
                        "amount",
                        recordCurrency,
                      )}
                    </Text>
                  ) : null}
                  <Text className="text-xs text-muted-foreground">
                    {new Date(item.occurredAt).toLocaleString()}
                  </Text>
                </View>
              </View>
              <Button
                variant="ghost"
                accessibilityState={{ expanded: !!expanded[item._id] }}
                onPress={() =>
                  setExpanded((previous) => ({
                    ...previous,
                    [item._id]: !previous[item._id],
                  }))
                }
              >
                <Text>{expanded[item._id] ? "Show less" : "View details"}</Text>
              </Button>
              {expanded[item._id] ? (
                <View className="gap-3">
                  {changes.map(([field, change]) => (
                    <View key={field} className="gap-1">
                      <Text className="font-semibold">
                        {fieldLabels[field] || field}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        Before:{" "}
                        {activityValue(
                          change.before,
                          field,
                          recordCurrency,
                          names,
                        )}
                      </Text>
                      <Text className="text-sm">
                        After:{" "}
                        {activityValue(
                          change.after,
                          field,
                          recordCurrency,
                          names,
                        )}
                      </Text>
                    </View>
                  ))}
                  {!changes.length && item.snapshot?.paidBy ? (
                    <Text className="text-sm">
                      Paid by{" "}
                      {activityValue(
                        item.snapshot.paidBy,
                        "paidBy",
                        recordCurrency,
                        names,
                      )}{" "}
                      ·{" "}
                      {activityValue(
                        item.snapshot.splitType,
                        "splitType",
                        recordCurrency,
                        names,
                      )}
                    </Text>
                  ) : null}
                  {!changes.length && item.action !== "BILL_PAID"
                    ? Object.entries(item.snapshot ?? {})
                        .filter(
                          ([field, value]) =>
                            [
                              "category",
                              "date",
                              "notes",
                              "participants",
                              "items",
                              "adjustments",
                            ].includes(field) &&
                            value != null &&
                            value !== "" &&
                            (!Array.isArray(value) || value.length > 0),
                        )
                        .map(([field, value]) => (
                          <View key={field} className="gap-1">
                            <Text className="font-semibold">
                              {fieldLabels[field] || field}
                            </Text>
                            <Text className="text-sm">
                              {activityValue(
                                value,
                                field,
                                recordCurrency,
                                names,
                              )}
                            </Text>
                          </View>
                        ))
                    : null}
                  {item.action === "EXPENSE_DELETED" ? (
                    <Text className="text-sm text-muted-foreground">
                      This expense was deleted. Its history remains here.
                    </Text>
                  ) : null}
                  {item.action === "BILL_PAID" ? (
                    <Text className="text-sm text-muted-foreground">
                      The payment created one linked expense.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        }}
        ListFooterComponent={
          pagination && pagination.totalPages > 1 ? (
            <View className="gap-3 py-4">
              <Text className="text-center text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </Text>
              <View className="flex-row gap-3">
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={isFetching || page <= 1}
                  onPress={() => {
                    setExpanded({});
                    setPage((p) => p - 1);
                  }}
                >
                  <Text>Previous</Text>
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={isFetching || page >= pagination.totalPages}
                  onPress={() => {
                    setExpanded({});
                    setPage((p) => p + 1);
                  }}
                >
                  <Text>Next</Text>
                </Button>
              </View>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
