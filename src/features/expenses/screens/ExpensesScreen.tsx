import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenBackground from "@/components/layout/ScreenBackground";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { tabContentBottomInset } from "@/constants/navigation";
import { authError } from "@/features/auth/errors";
import { useGetMyGroupsQuery } from "@/features/groups/groupsApi";
import { useTheme } from "@/theme/ThemeProvider";
import {
  useDeleteExpenseMutation,
  useGetGroupExpensesQuery,
} from "../expensesApi";

import { categoryIcons } from "../categoryIcons";
import ExpenseFiltersModal from "../components/ExpenseFiltersModal";
import type { ExpenseFilters } from "../filters";

const splitLabels = {
  EQUAL: "Equal split",
  EXACT: "Exact split",
  PERCENTAGE: "Percentage split",
};

export default function ExpensesScreen({ groupId }: { groupId: string }) {
  const { colors, surfaces } = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ExpenseFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = !!(
    filters.category ||
    filters.startDate ||
    filters.endDate
  );

  function applyFilters(next: ExpenseFilters) {
    setFilters(next);
    setPage(1);
    setConfirmId(null);
    setDeleteError("");
    setShowFilters(false);
  }

  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteExpense, { isLoading: deleting }] = useDeleteExpenseMutation();
  const deletingRef = useRef(false);

  async function handleDelete(expenseId: string) {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleteError("");
    try {
      await deleteExpense({ groupId, expenseId }).unwrap();
      setConfirmId(null);
      setPage(1);
    } catch (error) {
      setDeleteError(
        authError(error, "Could not delete the expense. Try again."),
      );
    } finally {
      deletingRef.current = false;
    }
  }

  const { data: groupsData } = useGetMyGroupsQuery();
  const group = groupsData?.data.groups.find((item) => item.id === groupId);

  const { currentData, isFetching, isError, error, refetch } =
    useGetGroupExpensesQuery(
      { groupId, page, limit: 10, ...filters },
      { skip: !groupId, refetchOnMountOrArgChange: true },
    );

  function formatAmount(amount: number) {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

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
      <View style={{ padding: 20, gap: 8 }}>
        <Text className="text-3xl font-semibold tracking-tight">Expenses</Text>

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
          <Ionicons
            name="add"
            size={22}
            color={colors.primaryForeground}
            accessible={false}
          />
          <Text>Add expense</Text>
        </Button>

        <View className="flex-row items-center gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={deleting}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="filter-outline"
              size={18}
              color={colors.foreground}
              accessible={false}
            />
            <Text>{hasFilters ? "Edit filters" : "Filter expenses"}</Text>
          </Button>
          {hasFilters ? (
            <Button
              variant="ghost"
              disabled={deleting}
              onPress={() => applyFilters({})}
            >
              <Text>Clear</Text>
            </Button>
          ) : null}
        </View>
        {hasFilters ? (
          <Text className="text-xs text-muted-foreground">
            {[
              filters.category?.toLowerCase(),
              filters.startDate ? `From ${filters.startDate}` : undefined,
              filters.endDate ? `Through ${filters.endDate}` : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        ) : null}
        {currentData ? (
          <Text className="text-xs text-muted-foreground">
            {currentData.pagination.total}{" "}
            {hasFilters ? "matching" : "recorded"} expenses
          </Text>
        ) : null}

        {isError ? (
          <View className="mt-3 gap-3">
            <Text accessibilityLiveRegion="polite">
              {authError(error, "Unable to load expenses. Try again.")}
            </Text>

            <Button disabled={isFetching} onPress={() => void refetch()}>
              <Text>{isFetching ? "Retrying…" : "Retry"}</Text>
            </Button>
          </View>
        ) : null}
      </View>

      {(currentData?.data.expenses.length ?? 0) === 0 ? (
        <View
          style={{
            flex: 1,
            padding: 20,
            paddingBottom: tabContentBottomInset(insets.bottom),
          }}
        >
          {isFetching ? (
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
                {hasFilters ? "No matching expenses" : "No expenses yet"}
              </Text>

              <Text className="text-center text-sm text-muted-foreground">
                {hasFilters
                  ? "Try a different category or date range, or clear your filters."
                  : `No expenses have been recorded for ${group?.name ?? "this group"}. Tap Add expense to record one.`}
              </Text>
              {hasFilters ? (
                <Button variant="outline" onPress={() => applyFilters({})}>
                  <Text>Clear filters</Text>
                </Button>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <FlatList
          scrollIndicatorInsets={{
            bottom: tabContentBottomInset(insets.bottom),
          }}
          style={{ flex: 1 }}
          data={currentData?.data.expenses ?? []}
          keyExtractor={(expense) => expense._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: tabContentBottomInset(insets.bottom),
            flexGrow: 1,
          }}
          refreshing={isFetching && !!currentData}
          onRefresh={() => {
            if (page !== 1) setPage(1);
            else if (groupId && !isFetching) void refetch();
          }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <View
              className="gap-4 rounded-[24px] bg-card p-5"
              style={surfaces.card}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-secondary">
                  <Ionicons
                    name={categoryIcons[item.category] ?? categoryIcons.OTHERS}
                    size={21}
                    color={colors.primary}
                    accessible={false}
                  />
                </View>

                <View className="min-w-0 flex-1 gap-1">
                  <Text className="font-semibold">{item.description}</Text>

                  <Text className="text-xs text-muted-foreground">
                    {item.category.toLowerCase()}
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap items-center justify-between gap-3">
                <Text className="text-xl font-semibold">
                  {group?.currency ? `${group.currency} ` : ""}
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
              <View className="gap-2 border-t border-border pt-3">
                {item.participants.map((participant, index) => (
                  <View
                    key={participant.userId?._id ?? index}
                    className="flex-row justify-between gap-3"
                  >
                    <Text className="flex-1 text-sm text-muted-foreground">
                      {participant.userId
                        ? `${participant.userId.firstName} ${participant.userId.lastName}`
                        : "Former member"}
                      {participant.percentage != null
                        ? ` (${participant.percentage}%)`
                        : ""}
                    </Text>
                    <Text className="text-sm">
                      {formatAmount(participant.amount)}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="gap-3 border-t border-border pt-3">
                {confirmId === item._id ? (
                  <>
                    <Text accessibilityLiveRegion="polite">
                      Delete “{item.description}” (
                      {group?.currency ? `${group.currency} ` : ""}
                      {formatAmount(item.amount)})? This cannot be undone and
                      will update group balances.
                    </Text>
                    {deleteError ? (
                      <Text
                        accessibilityLiveRegion="polite"
                        className="text-destructive"
                      >
                        {deleteError}
                      </Text>
                    ) : null}
                    <View className="flex-row flex-wrap gap-3">
                      <Button
                        variant="destructive"
                        disabled={deleting}
                        onPress={() => void handleDelete(item._id)}
                      >
                        <Text>{deleting ? "Deleting…" : "Confirm delete"}</Text>
                      </Button>
                      <Button
                        variant="outline"
                        disabled={deleting}
                        onPress={() => {
                          setConfirmId(null);
                          setDeleteError("");
                        }}
                      >
                        <Text>Cancel</Text>
                      </Button>
                    </View>
                  </>
                ) : (
                  <View className="flex-row gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={deleting}
                      accessibilityLabel={`Edit ${item.description}`}
                      onPress={() =>
                        router.push({
                          pathname:
                            "/groups/[groupId]/expenses/[expenseId]/edit",
                          params: { groupId, expenseId: item._id },
                        })
                      }
                    >
                      <Text>Edit</Text>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={deleting}
                      accessibilityLabel={`Delete ${item.description}`}
                      onPress={() => {
                        setConfirmId(item._id);
                        setDeleteError("");
                      }}
                    >
                      <Text className="text-destructive">Delete</Text>
                    </Button>
                  </View>
                )}
              </View>
              {item.notes ? (
                <Text className="text-sm text-muted-foreground">
                  {item.notes}
                </Text>
              ) : null}
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
                      isFetching || !currentData.pagination.hasPreviousPage
                    }
                    onPress={() => setPage((value) => value - 1)}
                  >
                    <Text>Previous</Text>
                  </Button>

                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={isFetching || !currentData.pagination.hasNextPage}
                    onPress={() => setPage((value) => value + 1)}
                  >
                    <Text>Next</Text>
                  </Button>
                </View>
              </View>
            ) : null
          }
        />
      )}
      {showFilters ? (
        <ExpenseFiltersModal
          filters={filters}
          onApply={applyFilters}
          onClose={() => setShowFilters(false)}
        />
      ) : null}
    </View>
  );
}
