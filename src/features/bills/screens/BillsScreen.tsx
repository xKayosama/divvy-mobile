import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ScreenBackground from "@/components/layout/ScreenBackground";
import { tabContentBottomInset } from "@/constants/navigation";
import { authError } from "@/features/auth/errors";
import { useGetMyGroupsQuery } from "@/features/groups/groupsApi";
import { useTheme } from "@/theme/ThemeProvider";
import { useDeleteBillMutation, useGetGroupBillsQuery } from "../billsApi";
import { billCategories } from "../billForm";
import BillStatusBadge from "../components/BillStatusBadge";

export default function BillsScreen({ groupId }: { groupId: string }) {
  const { colors, surfaces } = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBill, { isLoading: deleting }] = useDeleteBillMutation();
  const deletingRef = useRef(false);

  async function remove(billId: string) {
    if (deletingRef.current) return;
    if (
      !currentData?.data.bills.some(
        (bill) => bill._id === billId && bill.status !== "PAID",
      )
    )
      return;
    deletingRef.current = true;
    setDeleteError("");
    try {
      await deleteBill({ groupId, billId }).unwrap();
      setConfirmId(null);
      setPage(1);
    } catch (error) {
      setDeleteError(
        authError(error, "Could not delete this bill. Try again."),
      );
    } finally {
      deletingRef.current = false;
    }
  }

  const { data: groupsData } = useGetMyGroupsQuery();
  const group = groupsData?.data.groups.find((item) => item.id === groupId);

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
        <Text
          style={{
            fontSize: 30,
            lineHeight: 38,
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
        {pagination ? (
          <Text style={{ color: colors.mutedForeground }}>
            {pagination.total} {pagination.total === 1 ? "bill" : "bills"}{" "}
            recorded
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
          isFetching ? (
            <View style={{ alignItems: "center", gap: 12, padding: 32 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.foreground }}>Loading bills…</Text>
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
                Tap Add bill to record a bill and its due date.
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

            {item.paidBy ? (
              <Text style={{ color: colors.mutedForeground }}>
                {item.status === "PAID" ? "Paid by" : "Payer"}{" "}
                {item.paidBy.firstName} {item.paidBy.lastName}
              </Text>
            ) : null}

            {item.status !== "PAID" ? (
              <Button
                disabled={deleting}
                variant="outline"
                accessibilityLabel={`Mark ${item.name} as paid`}
                onPress={() =>
                  router.push({
                    pathname: "/groups/[groupId]/bills/[billId]/pay",
                    params: { groupId, billId: item._id },
                  })
                }
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={colors.foreground}
                  accessible={false}
                />
                <Text>Mark as paid</Text>
              </Button>
            ) : null}
            {item.status === "PAID" ? (
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="lock-closed-outline"
                  size={14}
                  color={colors.mutedForeground}
                  accessible={false}
                />
                <Text className="text-xs text-muted-foreground">
                  Paid bills cannot be edited or deleted.
                </Text>
              </View>
            ) : confirmId === item._id ? (
              <View className="gap-3 border-t border-border pt-3">
                <Text accessibilityLiveRegion="polite">
                  Delete “{item.name}” (
                  {group?.currency ? `${group.currency} ` : ""}
                  {formatAmount(item.amount)})? This cannot be undone.
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {item.isRecurring
                    ? "This stops future generation from this bill. Bills already generated remain unchanged."
                    : item.recurrenceSourceId
                      ? "Only this occurrence will be removed. The recurring schedule continues."
                      : "This removes the bill from your group."}
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
                    onPress={() => void remove(item._id)}
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
              </View>
            ) : (
              <View className="flex-row gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={deleting}
                  accessibilityLabel={`Edit ${item.name}`}
                  onPress={() =>
                    router.push({
                      pathname: "/groups/[groupId]/bills/[billId]/edit",
                      params: { groupId, billId: item._id },
                    })
                  }
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={colors.foreground}
                    accessible={false}
                  />
                  <Text>Edit</Text>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={deleting}
                  accessibilityLabel={`Delete ${item.name}`}
                  onPress={() => {
                    setConfirmId(item._id);
                    setDeleteError("");
                  }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.destructive}
                    accessible={false}
                  />
                  <Text className="text-destructive">Delete</Text>
                </Button>
              </View>
            )}
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
    </View>
  );
}
