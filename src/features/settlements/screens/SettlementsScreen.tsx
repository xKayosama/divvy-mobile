import { ContentState, QueryErrorState } from "@/components/ui/content-state";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useGetMyGroupsQuery } from "@/features/groups/groupsApi";
import { useAppSelector } from "@/hooks/redux";
import { useTheme } from "@/theme/ThemeProvider";
import {
  useGetSettlementHistoryQuery,
  useGetSettlementSuggestionsQuery,
} from "../settlementsApi";

export default function SettlementsScreen({ groupId }: { groupId: string }) {
  const { colors, surfaces } = useTheme();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const [page, setPage] = useState(1);
  const { data: groups } = useGetMyGroupsQuery();
  const group = groups?.data.groups.find((item) => item.id === groupId);
  const suggestions = useGetSettlementSuggestionsQuery(groupId, {
    refetchOnMountOrArgChange: true,
  });
  const history = useGetSettlementHistoryQuery(
    { groupId, page },
    { refetchOnMountOrArgChange: true },
  );
  const hasOutstanding =
    suggestions.currentData?.data.settlements.some(
      (item) => item.from._id === userId,
    ) ?? false;
  const format = (amount: number) =>
    `${group?.currency ? `${group.currency} ` : ""}${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  function refresh() {
    if (!suggestions.isFetching) void suggestions.refetch();
    if (page !== 1) setPage(1);
    else if (!history.isFetching) void history.refetch();
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={history.currentData?.data.settlements ?? []}
        keyExtractor={(item) => item._id}
        refreshing={history.isFetching || suggestions.isFetching}
        onRefresh={refresh}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 32,
          gap: 12,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View className="gap-5 pb-2">
            <View className="flex-row items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                accessibilityLabel="Back to dashboard"
                onPress={() =>
                  router.navigate({
                    pathname: "/groups/[groupId]/home",
                    params: { groupId },
                  })
                }
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={colors.foreground}
                  accessible={false}
                />
              </Button>
              <View className="flex-1">
                <Text className="text-3xl font-semibold">Settle up</Text>
                <Text className="text-sm text-muted-foreground">
                  {group?.name ?? "Your group"}
                </Text>
              </View>
            </View>
            <Button
              disabled={
                suggestions.isFetching || suggestions.isError || !hasOutstanding
              }
              onPress={() =>
                router.push({
                  pathname: "/groups/[groupId]/settlements/record",
                  params: { groupId },
                })
              }
            >
              <Ionicons
                name="swap-horizontal-outline"
                size={20}
                color={colors.primaryForeground}
                accessible={false}
              />
              <Text>
                {suggestions.currentData &&
                !suggestions.isError &&
                !hasOutstanding
                  ? "You’re settled up"
                  : "Record a payment"}
              </Text>
            </Button>
            <Text className="text-sm leading-5 text-muted-foreground">
              Record money you have already sent. Divvy does not transfer money.
            </Text>
            <Text className="text-lg font-semibold">Suggested repayments</Text>
            {suggestions.isError ? (
              <QueryErrorState error={suggestions.error} subject="Repayment suggestions" busy={suggestions.isFetching} onRetry={() => void suggestions.refetch()} onBack={() => router.navigate("/groups")} />
            ) : suggestions.isLoading ? (
              <ActivityIndicator accessibilityLabel="Loading suggestions" />
            ) : suggestions.currentData?.data.settlements.length === 0 ? (
              <ContentState icon="checkmark-circle-outline" title="All settled up" description="There are no suggested repayments between current active members." />
            ) : (
              suggestions.currentData?.data.settlements.map((item) => (
                <View
                  key={`${item.from._id}:${item.to._id}`}
                  className="gap-3 rounded-[24px] bg-card p-5"
                  style={surfaces.card}
                >
                  <Text className="font-semibold">
                    {item.from.firstName} {item.from.lastName} →{" "}
                    {item.to.firstName} {item.to.lastName}
                  </Text>
                  <Text className="text-2xl font-semibold text-primary">
                    {format(item.amount)}
                  </Text>
                  {item.from._id === userId ? (
                    <Button
                      variant="outline"
                      onPress={() =>
                        router.push({
                          pathname: "/groups/[groupId]/settlements/record",
                          params: {
                            groupId,
                            to: item.to._id,
                            amount: String(item.amount),
                          },
                        })
                      }
                    >
                      <Text>Record this payment</Text>
                    </Button>
                  ) : null}
                </View>
              ))
            )}
            <Text className="text-lg font-semibold">Payment history</Text>
            {history.isError ? (
              <QueryErrorState error={history.error} subject="Payment history" busy={history.isFetching} onRetry={() => void history.refetch()} onBack={() => router.navigate("/groups")} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          history.isFetching ? (
            <ActivityIndicator accessibilityLabel="Loading payment history" />
          ) : !history.isError ? (
            <ContentState icon="time-outline" title={page > 1 ? "No payments on this page" : "No payments recorded"} description={page > 1 ? "Return to the first page to see the latest recorded payments." : "Payments you record will appear here with the sender, recipient and date."} actionLabel={page > 1 ? "First page" : undefined} onAction={page > 1 ? () => setPage(1) : undefined} />
          ) : null
        }
        renderItem={({ item }) => (
          <View className="gap-2 rounded-2xl bg-card p-4" style={surfaces.card}>
            <Text className="font-semibold">
              {item.from
                ? `${item.from.firstName} ${item.from.lastName}`
                : "Unavailable account"}{" "}
              →{" "}
              {item.to
                ? `${item.to.firstName} ${item.to.lastName}`
                : "Unavailable account"}
            </Text>
            <Text className="text-xl font-semibold">{format(item.amount)}</Text>
            <Text className="text-xs text-muted-foreground">
              Paid{" "}
              {new Date(item.paidAt).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        )}
        ListFooterComponent={
          history.currentData &&
          history.currentData.pagination.totalPages > 1 ? (
            <View className="gap-3 pt-4">
              <Text className="text-center text-sm text-muted-foreground">
                Page {page} of {history.currentData.pagination.totalPages}
              </Text>
              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={history.isFetching || page <= 1}
                  onPress={() => setPage((value) => value - 1)}
                >
                  <Text>Previous</Text>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={
                    history.isFetching ||
                    page >= history.currentData.pagination.totalPages
                  }
                  onPress={() => setPage((value) => value + 1)}
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
