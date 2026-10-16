import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
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
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const searchPending = searchText.trim() !== search;
  const searchInput = useRef<TextInput>(null);
  const searchProgress = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const searchStyle = useAnimatedStyle(() => ({
    height: searchProgress.get() * 50,
    opacity: searchProgress.get(),
    marginTop: -8 * (1 - searchProgress.get()),
    overflow: "hidden",
  }));

  useEffect(() => {
    searchProgress.set(withTiming(showSearch ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }));
    if (!showSearch) {
      searchInput.current?.blur();
      return;
    }
    const timer = setTimeout(() => searchInput.current?.focus(), reducedMotion ? 0 : 220);
    return () => clearTimeout(timer);
  }, [showSearch, searchProgress, reducedMotion]);

  useEffect(() => {
    if (!searchPending) return;
    const timer = setTimeout(() => {
      setSearch(searchText.trim());
      setPage(1);
      setConfirmId(null);
      setDeleteError("");
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText, searchPending]);

  function clearSearch() {
    setSearchText("");
    setSearch("");
    setPage(1);
    setConfirmId(null);
    setDeleteError("");
  }

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

  const { currentData: queryData, isFetching, isError, error, refetch } =
    useGetGroupExpensesQuery(
      { groupId, page, limit: 10, ...filters, search: search || undefined },
      { skip: !groupId, refetchOnMountOrArgChange: true },
    );

  const currentData = searchPending ? undefined : queryData;
  const hasCriteria = hasFilters || !!search;

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
        <View className="flex-row items-center justify-between gap-3">
          <Text className="min-w-0 flex-1 text-3xl font-semibold tracking-tight">Expenses</Text>
          <Button
            variant={showSearch ? "default" : "outline"}
            className="h-12 w-12 rounded-2xl p-0"
            accessibilityLabel={showSearch ? "Close expense search" : "Search expenses"}
            accessibilityState={{ expanded: showSearch }}
            onPress={() => {
              if (showSearch) clearSearch();
              setShowSearch((value) => !value);
            }}
          >
            <Ionicons
              name={showSearch ? "close-outline" : "search-outline"}
              size={21}
              color={showSearch ? colors.primaryForeground : colors.foreground}
              accessible={false}
            />
          </Button>
          <Button
            variant={hasFilters ? "default" : "outline"}
            className="h-12 w-12 rounded-2xl p-0"
            accessibilityLabel={hasFilters ? "Edit expense filters, filters active" : "Filter expenses"}
            accessibilityState={{ selected: hasFilters }}
            disabled={deleting}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="options-outline"
              size={21}
              color={hasFilters ? colors.primaryForeground : colors.foreground}
              accessible={false}
            />
          </Button>
        </View>

        <Text className="text-sm text-muted-foreground">
          {group?.name ?? "Your group"}
          {group ? ` · ${group.currency}` : ""}
        </Text>

        <View className="mt-2 flex-row gap-2">
          <Button
            className="h-11 flex-1 rounded-xl"
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

          <Button
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onPress={() =>
              router.push({
                pathname: "/groups/[groupId]/expenses/scan",
                params: { groupId },
              })
            }
          >
            <Ionicons
              name="scan-outline"
              size={20}
              color={colors.primary}
              accessible={false}
            />
            <Text>Scan receipt</Text>
          </Button>
        </View>

        <Animated.View
          style={searchStyle}
          pointerEvents={showSearch ? "auto" : "none"}
          accessibilityElementsHidden={!showSearch}
          importantForAccessibility={showSearch ? "auto" : "no-hide-descendants"}
        >
          <View className="min-h-12 flex-1 flex-row items-center rounded-2xl border border-border bg-card pl-3">
            <Ionicons name="search-outline" size={20} color={colors.mutedForeground} accessible={false} />
            <TextInput
              ref={searchInput}
              className="min-w-0 flex-1 px-3 py-3 text-base text-foreground"
              style={{ minHeight: 48 }}
              placeholder="Search expenses"
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Search expenses by description"
              value={searchText}
              onChangeText={setSearchText}
              maxLength={200}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                setSearch(searchText.trim());
                setPage(1);
                setConfirmId(null);
                setDeleteError("");
              }}
            />
            {searchText ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear expense search"
                className="h-12 w-12 items-center justify-center"
                onPress={() => {
                  clearSearch();
                  searchInput.current?.focus();
                }}
              >
                <Ionicons name="close-circle" size={21} color={colors.mutedForeground} accessible={false} />
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
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
            {hasCriteria ? "matching" : "recorded"} expenses
          </Text>
        ) : null}

        {isError && !searchPending ? (
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
          {isFetching || searchPending ? (
            <View className="items-center gap-3 py-10">
              <ActivityIndicator color={colors.primary} />
              <Text>{searchPending || search ? "Searching expenses…" : "Loading expenses…"}</Text>
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
                {hasCriteria ? "No expenses found" : "No expenses yet"}
              </Text>

              <Text className="text-center text-sm text-muted-foreground">
                {hasCriteria
                  ? "Try another description, category or date range."
                  : `No expenses have been recorded for ${group?.name ?? "this group"}. Tap Add expense to record one.`}
              </Text>
              {hasCriteria ? (
                <Button variant="outline" onPress={() => {
                  clearSearch();
                  applyFilters({});
                }}>
                  <Text>Clear search and filters</Text>
                </Button>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : (
        <FlatList
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
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
