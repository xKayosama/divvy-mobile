import { frequencyLabels } from "../recurrence";
import { formatCurrencyAmount } from "@/features/groups/money";
import { ContentState, QueryErrorState } from "@/components/ui/content-state";
import { ListSortControl } from "@/components/ui/list-sort-control";
import type { ExpenseSort } from "../types";
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
import { useGetMyGroupsQuery } from "@/features/groups/groupsApi";
import { useTheme } from "@/theme/ThemeProvider";
import { useGetGroupExpensesQuery } from "../expensesApi";

import { categoryIcons } from "../categoryIcons";
import ExpenseFiltersModal from "../components/ExpenseFiltersModal";
import type { ExpenseFilters } from "../filters";

const splitLabels = {
  EQUAL: "Equal split", SHARES: "By shares",
  ITEMIZED: "Itemized split",
  EXACT: "Exact split",
  PERCENTAGE: "Percentage split",
};

export default function ExpensesScreen({ groupId, initialFilters = {} }: { groupId: string; initialFilters?: ExpenseFilters }) {
  const { colors, surfaces } = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<ExpenseSort>("newest");

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
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText, searchPending]);

  function clearSearch() {
    setSearchText("");
    setSearch("");
    setPage(1);
  }

  const [filters, setFilters] = useState<ExpenseFilters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = !!(
    filters.category ||
    filters.startDate ||
    filters.endDate
  );

  function applyFilters(next: ExpenseFilters) {
    setFilters(next);
    setPage(1);
    setShowFilters(false);
  }

  const { data: groupsData } = useGetMyGroupsQuery();
  const group = groupsData?.data.groups.find((item) => item.id === groupId);

  const { currentData: queryData, isFetching, isError, error, refetch } =
    useGetGroupExpensesQuery(
      { groupId, page, limit: 10, ...filters, sort, search: search || undefined },
      { skip: !groupId, refetchOnMountOrArgChange: true },
    );

  const currentData = searchPending || isError ? undefined : queryData;
  const hasCriteria = hasFilters || !!search;

  function formatAmount(amount: number) {
    return formatCurrencyAmount(amount, group?.currency);
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
        <View className="flex-row items-center justify-between gap-2">
          <Text className="min-w-0 flex-1 text-2xl font-semibold tracking-tight">Expenses</Text>
          <Button
            variant={showSearch ? "default" : "outline"}
            className="h-11 w-11 rounded-2xl p-0"
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
            className="h-11 w-11 rounded-2xl p-0"
            accessibilityLabel={hasFilters ? "Edit expense filters, filters active" : "Filter expenses"}
            accessibilityState={{ selected: hasFilters }}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons
              name="options-outline"
              size={21}
              color={hasFilters ? colors.primaryForeground : colors.foreground}
              accessible={false}
            />
          </Button>
          <ListSortControl title="Expenses" value={sort} defaultValue="newest" options={[{ value: "newest", label: "Newest first" },{ value: "oldest", label: "Oldest first" },{ value: "amount_high", label: "Highest amount" },{ value: "amount_low", label: "Lowest amount" }]} onChange={value => { setSort(value); setPage(1); }} />
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
              filters.category?.toLowerCase().replace(/_/g, " "),
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
          <QueryErrorState error={error} subject="Expenses" busy={isFetching} onRetry={() => void refetch()} onBack={() => router.navigate("/groups")} />
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
            <ContentState icon="receipt-outline" title={hasCriteria ? "No expenses found" : "No expenses yet"} description={hasCriteria ? "Try a different search or clear your filters to see more results." : "Record a shared purchase to track who paid and how it’s split."} actionLabel={hasCriteria ? "Clear search and filters" : "Add expense"} onAction={() => { if (hasCriteria) { clearSearch(); applyFilters({}); } else router.push({ pathname: "/groups/[groupId]/expenses/create", params: { groupId } }); }} />
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View expense details for ${item.description}`}
              className="gap-3 rounded-[24px] bg-card p-4 active:opacity-70"
              style={surfaces.card}
              onPress={() => router.push({ pathname: "/groups/[groupId]/expenses/[expenseId]", params: { groupId, expenseId: item._id } })}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
                  <Ionicons name={categoryIcons[item.category] ?? categoryIcons.OTHERS} size={21} color={colors.primary} accessible={false} />
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text numberOfLines={2} ellipsizeMode="tail" className="w-full min-w-0 shrink font-semibold leading-6 web:break-words">{item.description}</Text>
                  <Text className="text-xs capitalize text-muted-foreground">{item.category.toLowerCase().replace(/_/g, " ")}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} accessible={false} />
              </View>
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="text-xl font-semibold">{group?.currency ? `${group.currency} ` : ""}{formatAmount(item.amount)}</Text>
                <Text className="text-xs text-muted-foreground">{splitLabels[item.splitType]}</Text>
                {item.recurring ? <Text className="text-xs text-primary">{frequencyLabels[item.recurring.frequency]} · {item.recurring.paused ? "Paused" : item.recurring.nextDate ? "Repeating" : "Completed"}</Text> : item.recurrenceSourceId ? <Text className="text-xs text-muted-foreground">Recurring occurrence</Text> : null}
              </View>
              <Text className="text-xs text-muted-foreground">
                Paid by {item.paidBy ? `${item.paidBy.firstName} ${item.paidBy.lastName}` : "Unknown member"}
                {" · "}{new Date(item.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
              </Text>
            </Pressable>
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
