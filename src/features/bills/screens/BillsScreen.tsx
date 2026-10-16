import { ListSortControl } from "@/components/ui/list-sort-control";
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenBackground from "@/components/layout/ScreenBackground";
import { tabContentBottomInset } from "@/constants/navigation";
import { authError } from "@/features/auth/errors";
import { useGetMyGroupsQuery } from "@/features/groups/groupsApi";
import { useTheme } from "@/theme/ThemeProvider";
import { useGetGroupBillsQuery } from "../billsApi";
import { billCategories } from "../billForm";
import BillFiltersModal, { type BillFilters } from "../components/BillFiltersModal";
import type { BillStatus, BillSort } from "../types";
import BillStatusBadge from "../components/BillStatusBadge";

export default function BillsScreen({ groupId, initialStatus }: { groupId: string; initialStatus?: BillStatus }) {
  const { colors, surfaces } = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<BillSort>("due_soonest");
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

  const [filters, setFilters] = useState<BillFilters>(initialStatus ? { status: initialStatus } : {});
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = !!(
    filters.category ||
    filters.status ||
    filters.isRecurring !== undefined
  );

  function applyFilters(next: BillFilters) {
    setFilters(next);
    setPage(1);


    setShowFilters(false);
  }

  const { data: groupsData } = useGetMyGroupsQuery();
  const group = groupsData?.data.groups.find((item) => item.id === groupId);

  const { currentData: queryData, isFetching, isError, error, refetch } =
    useGetGroupBillsQuery(
      { groupId, page, limit: 10, ...filters, sort, search: search || undefined },
      { skip: !groupId, refetchOnMountOrArgChange: true },
    );

  const currentData = searchPending ? undefined : queryData;
  const hasCriteria = hasFilters || !!search;
  const bills = currentData?.data.bills ?? [];
  const pagination = currentData?.pagination;

  function formatAmount(amount: number) {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function refresh() {
    if (isFetching) return;
    if (page !== 1) setPage(1);
    else void refetch();
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
          <Text className="min-w-0 flex-1 text-2xl font-semibold tracking-tight">Bills</Text>
          <Button
            variant={showSearch ? "default" : "outline"}
            className="h-11 w-11 rounded-2xl p-0"
            accessibilityLabel={showSearch ? "Close bill search" : "Search bills"}
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
            accessibilityLabel={hasFilters ? "Edit bill filters, filters active" : "Filter bills"}
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
          <ListSortControl title="Bills" value={sort} defaultValue="due_soonest" options={[{ value: "due_soonest", label: "Nearest due date" },{ value: "due_latest", label: "Latest due date" },{ value: "amount_high", label: "Highest amount" },{ value: "amount_low", label: "Lowest amount" }]} onChange={value => { setSort(value); setPage(1); }} />
        </View>

        <Text style={{ color: colors.mutedForeground }}>
          {group?.name ?? "Your group"}
          {group ? ` · ${group.currency}` : ""}
        </Text>

        <Button
          className="mt-3"
          onPress={() =>
            router.push({
              pathname: "/groups/[groupId]/bills/create",
              params: { groupId },
            })
          }
        >
          <Ionicons
            name="add"
            size={20}
            color={colors.primaryForeground}
            accessible={false}
          />
          <Text>Add bill</Text>
        </Button>
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
              placeholder="Search bills"
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel="Search bills by name or notes"
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
                accessibilityLabel="Clear bill search"
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
          <Text className="text-xs text-muted-foreground">{[
            filters.category?.toLowerCase(), filters.status?.toLowerCase(),
            filters.isRecurring === undefined ? undefined : filters.isRecurring ? "Recurring" : "One-time",
          ].filter(Boolean).join(" · ")}</Text>
        ) : null}
        {pagination ? (
          <Text style={{ color: colors.mutedForeground }}>
            {pagination.total} {pagination.total === 1 ? "bill" : "bills"}{" "}
            {hasCriteria ? "matching" : "recorded"}
          </Text>
        ) : null}

        {isError && !searchPending ? (
          <View style={{ gap: 8 }}>
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: colors.destructive }}
            >
              {authError(error, "Unable to load bills.")}
            </Text>

            <Pressable
              accessibilityRole="button"
              disabled={isFetching}
              onPress={refresh}
              style={{ paddingVertical: 12, minHeight: 48 }}
            >
              <Text style={{ color: colors.primary }}>
                {isFetching ? "Retrying…" : "Retry"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <FlatList
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        scrollIndicatorInsets={{ bottom: tabContentBottomInset(insets.bottom) }}
        style={{ flex: 1 }}
        data={bills}
        keyExtractor={(bill) => bill._id}
        refreshing={isFetching}
        onRefresh={refresh}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: tabContentBottomInset(insets.bottom),
          flexGrow: 1,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          isFetching || searchPending ? (
            <View style={{ alignItems: "center", gap: 12, padding: 32 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.foreground }}>{searchPending || search ? "Searching bills…" : "Loading bills…"}</Text>
            </View>
          ) : !isError ? (
            <View style={{ alignItems: "center", gap: 8, padding: 32 }}>
              <Text
                style={{
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                {hasCriteria ? "No bills found" : "No bills yet"}
              </Text>
              <Text style={{ color: colors.mutedForeground }}>
                {hasCriteria ? "Try another name, note or filter." : "Tap Add bill to record a bill and its due date."}
              </Text>
              {hasCriteria ? <Button variant="outline" onPress={() => { clearSearch(); applyFilters({}); }}><Text>Clear search and filters</Text></Button> : null}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View bill details for ${item.name}`}
            onPress={() => router.push({ pathname: "/groups/[groupId]/bills/[billId]", params: { groupId, billId: item._id } })}
            style={{
              ...surfaces.card,
              padding: 20,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Ionicons
                name={billCategories[item.category] ?? billCategories.OTHER}
                size={24}
                color={colors.primary}
                accessible={false}
              />
              <Text
                style={{
                  flex: 1,
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                {item.name}
              </Text>

              <BillStatusBadge status={item.status} />
              <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} accessible={false} />
            </View>

            <Text
              style={{
                color: colors.foreground,
                fontSize: 24,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
              }}
            >
              {group?.currency ? `${group.currency} ` : ""}
              {formatAmount(item.amount)}
            </Text>

            <Text style={{ color: colors.mutedForeground }}>
              {item.category.toLowerCase()} · Due{" "}
              {new Date(item.dueDate).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
              })}
            </Text>

            {item.isRecurring && item.recurrence ? (
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="repeat-outline"
                  size={18}
                  color={colors.primary}
                  accessible={false}
                />
                <Text style={{ color: colors.primary, flex: 1 }}>
                  Recurring bill ·{" "}
                  {item.recurrence === "WEEKLY"
                    ? "Every week"
                    : item.recurrence === "MONTHLY"
                      ? "Every month"
                      : "Every year"}
                </Text>
              </View>
            ) : item.recurrenceSourceId ? (
              <Text style={{ color: colors.mutedForeground }}>
                Part of a recurring bill
              </Text>
            ) : null}

            {item.status === "PAID" ? (
              <View className="gap-2 rounded-2xl bg-secondary p-3">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="person-outline" size={16} color={colors.mutedForeground} accessible={false} />
                  <Text className="flex-1 text-sm">
                    Paid by {item.paidBy
                      ? `${item.paidBy.firstName} ${item.paidBy.lastName}`.trim() || "Unknown member"
                      : "Unknown member"}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="time-outline" size={16} color={colors.mutedForeground} accessible={false} />
                  <Text className="flex-1 text-xs text-muted-foreground">
                    {item.paidAt && Number.isFinite(new Date(item.paidAt).getTime())
                      ? `Payment recorded ${new Date(item.paidAt).toLocaleString("en-PH", {
                          month: "short", day: "numeric", year: "numeric",
                          hour: "numeric", minute: "2-digit",
                        })}`
                      : "Payment date unavailable"}
                  </Text>
                </View>
              </View>
            ) : item.paidBy ? (
              <Text style={{ color: colors.mutedForeground }}>
                Payer {item.paidBy.firstName} {item.paidBy.lastName}
              </Text>
            ) : null}

          </Pressable>
        )}
        ListFooterComponent={
          pagination && pagination.totalPages > 1 ? (
            <View style={{ marginTop: 20, gap: 12 }}>
              <Text
                style={{
                  textAlign: "center",
                  color: colors.mutedForeground,
                }}
              >
                Page {pagination.page} of {pagination.totalPages}
              </Text>

              <View style={{ flexDirection: "row", gap: 12 }}>
                {(["Previous", "Next"] as const).map((label) => {
                  const disabled =
                    isFetching ||
                    (label === "Previous"
                      ? !pagination.hasPreviousPage
                      : !pagination.hasNextPage);

                  return (
                    <Pressable
                      key={label}
                      accessibilityRole="button"
                      accessibilityState={{ disabled }}
                      disabled={disabled}
                      onPress={() =>
                        setPage((value) =>
                          label === "Previous" ? value - 1 : value + 1,
                        )
                      }
                      style={{
                        flex: 1,
                        padding: 14,
                        minHeight: 48,
                        alignItems: "center",
                        borderRadius: 12,
                        backgroundColor: colors.secondary,
                        opacity: disabled ? 0.4 : 1,
                      }}
                    >
                      <Text style={{ color: colors.primary }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null
        }
      />
      {showFilters ? <BillFiltersModal filters={filters} onApply={applyFilters} onClose={() => setShowFilters(false)} /> : null}
    </View>
  );
}
