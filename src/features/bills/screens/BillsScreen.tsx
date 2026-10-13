import { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/ThemeProvider";
import ScreenBackground from "@/components/layout/ScreenBackground";
import { tabContentBottomInset } from "@/constants/navigation";
import { authError } from "@/features/auth/errors";
import { useGetMyGroupsQuery } from "@/features/groups/groupsApi";
import { useGetGroupBillsQuery } from "../billsApi";
import BillStatusBadge from "../components/BillStatusBadge";

export default function BillsScreen({ groupId }: { groupId: string }) {
  const { colors, surfaces } = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);

  const { data: groupsData } = useGetMyGroupsQuery();
  const group = groupsData?.data.groups.find(
    (item) => item.id === groupId,
  );

  const { currentData, isFetching, isError, error, refetch } =
    useGetGroupBillsQuery(
      { groupId, page, limit: 10 },
      { refetchOnMountOrArgChange: true },
    );

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
        <Text style={{ color: colors.secondaryForeground, fontSize: 11, fontWeight: "600", letterSpacing: 2 }}>
          STAY ON TRACK
        </Text>
        <Text
          style={{
            fontSize: 30,
            fontWeight: "700",
            color: colors.foreground,
          }}
        >
          Bills
        </Text>

        <Text style={{ color: colors.mutedForeground }}>
          {group?.name ?? "Your group"}
          {group ? ` · ${group.currency}` : ""}
        </Text>

        {pagination ? (
          <Text style={{ color: colors.mutedForeground }}>
            {pagination.total} {pagination.total === 1 ? "bill" : "bills"} recorded
          </Text>
        ) : null}

        {isError ? (
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
              style={{ paddingVertical: 12 }}
            >
              <Text style={{ color: colors.primary }}>
                {isFetching ? "Retrying…" : "Retry"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <FlatList
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
          isFetching ? (
            <View style={{ alignItems: "center", gap: 12, padding: 32 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.foreground }}>
                Loading bills…
              </Text>
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
                No bills yet
              </Text>
              <Text style={{ color: colors.mutedForeground }}>
                Your group’s bills will appear here.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={{
              ...surfaces.card,
              padding: 20,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
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
              })}
            </Text>

            {item.isRecurring && item.recurrence ? (
              <Text style={{ color: colors.primary }}>
                Repeats {item.recurrence.toLowerCase()}
              </Text>
            ) : item.recurrenceSourceId ? (
              <Text style={{ color: colors.mutedForeground }}>
                Recurring bill occurrence
              </Text>
            ) : null}

            {item.paidBy ? (
              <Text style={{ color: colors.mutedForeground }}>
                {item.status === "PAID" ? "Paid by" : "Payer"}{" "}
                {item.paidBy.firstName} {item.paidBy.lastName}
              </Text>
            ) : null}

            {item.notes ? (
              <Text style={{ color: colors.mutedForeground }}>
                {item.notes}
              </Text>
            ) : null}
          </View>
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
                        alignItems: "center",
                        borderRadius: 12,
                        backgroundColor: colors.secondary,
                        opacity: disabled ? 0.4 : 1,
                      }}
                    >
                      <Text style={{ color: colors.primary }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );
}
