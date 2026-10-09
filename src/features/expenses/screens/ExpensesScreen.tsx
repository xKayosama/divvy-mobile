import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Text as NativeText,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { useGetMyGroupsQuery } from "@/features/groups/groupsApi";
import { useGetGroupExpensesQuery } from "../expensesApi";

const splitLabels = {
  EQUAL: "Equal split",
  EXACT: "Exact split",
  PERCENTAGE: "Percentage split",
};

export default function ExpensesScreen({
  groupId,
}: {
  groupId: string;
}) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);

  const { data: groupsData } = useGetMyGroupsQuery();
  const group = groupsData?.data.groups.find(
    (item) => item.id === groupId,
  );

  const { currentData, isFetching, isError, refetch } =
    useGetGroupExpensesQuery(
      { groupId, page, limit: 10 },
      { skip: !groupId },
    );

  function formatAmount(amount: number) {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <NativeText
        style={{
          color: "#102A56",
          fontSize: 18,
          padding: 20,
        }}
      >
        Screen loaded · Fetching: {String(isFetching)}
        {" · Error: "}
        {String(isError)}
        {" · Expenses: "}
        {currentData?.data.expenses.length ?? 0}
      </NativeText>

      <FlatList
        style={{ flex: 1 }}
        data={currentData?.data.expenses ?? []}
        keyExtractor={(expense) => expense._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 72 + Math.max(insets.bottom, 12) + 24,
          flexGrow: 1,
        }}
        refreshing={isFetching && !!currentData}
        onRefresh={() => {
          if (groupId && !isFetching) void refetch();
        }}
        ListHeaderComponent={
          <View className="mb-6 gap-2">
            <Text className="text-3xl font-semibold tracking-tight">
              Expenses
            </Text>

            <Text className="text-sm text-muted-foreground">
              {group?.name ?? "Your group"}
              {group ? ` · ${group.currency}` : ""}
            </Text>

            <Button
              className="mt-3 h-12 rounded-2xl"
              onPress={() =>
                router.push({
                  pathname: "/groups/[groupId]/expenses/create",
                  params: { groupId },
                })
              }
            >
              <Text>+ Add expense</Text>
            </Button>

            {currentData ? (
              <Text className="text-xs text-muted-foreground">
                {currentData.pagination.total} recorded expenses
              </Text>
            ) : null}

            {isError ? (
              <View className="mt-3 gap-3">
                <Text>Unable to load expenses.</Text>

                <Button
                  disabled={isFetching}
                  onPress={() => void refetch()}
                >
                  <Text>{isFetching ? "Retrying…" : "Retry"}</Text>
                </Button>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isFetching ? (
            <View className="items-center gap-3 py-10">
              <ActivityIndicator color={colors.primary} />
              <Text>Loading expenses…</Text>
            </View>
          ) : !isError ? (
            <View className="items-center gap-3 rounded-[24px] bg-card px-6 py-10">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-secondary">
                <Ionicons
                  name="receipt-outline"
                  size={28}
                  color={colors.primary}
                  accessible={false}
                />
              </View>

              <Text className="text-lg font-semibold">
                No expenses yet
              </Text>

              <Text className="text-center text-sm text-muted-foreground">
                Shared expenses will appear here once you add them.
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <View className="gap-4 rounded-[24px] bg-card p-5">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
                <Ionicons
                  name="receipt-outline"
                  size={21}
                  color={colors.primary}
                  accessible={false}
                />
              </View>

              <View className="min-w-0 flex-1 gap-1">
                <Text className="font-semibold">
                  {item.description}
                </Text>

                <Text className="text-xs text-muted-foreground">
                  {item.category.toLowerCase()}
                </Text>
              </View>
            </View>

            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <Text className="text-xl font-semibold">
                {formatAmount(item.amount)}
              </Text>

              <View className="rounded-full bg-secondary px-3 py-1">
                <Text className="text-xs text-secondary-foreground">
                  {splitLabels[item.splitType]}
                </Text>
              </View>
            </View>

            <Text className="text-xs text-muted-foreground">
              Paid by{" "}
              {item.paidBy
                ? `${item.paidBy.firstName} ${item.paidBy.lastName}`
                : "Unknown member"}
              {" · "}
              {new Date(item.date).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        )}
        ListFooterComponent={
          currentData && currentData.pagination.totalPages > 1 ? (
            <View className="mt-6 gap-3">
              <Text className="text-center text-xs text-muted-foreground">
                Page {currentData.pagination.page} of{" "}
                {currentData.pagination.totalPages}
              </Text>

              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={
                    isFetching ||
                    !currentData.pagination.hasPreviousPage
                  }
                  onPress={() => setPage((value) => value - 1)}
                >
                  <Text>Previous</Text>
                </Button>

                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={
                    isFetching ||
                    !currentData.pagination.hasNextPage
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