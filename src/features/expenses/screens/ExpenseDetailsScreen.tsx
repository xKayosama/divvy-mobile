import { formatCurrencyAmount } from "@/features/groups/money";
import { ContentState, QueryErrorState } from "@/components/ui/content-state";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ScreenBackground from "@/components/layout/ScreenBackground";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { authError } from "@/features/auth/errors";
import { useGetMyGroupsQuery } from "@/features/groups/groupsApi";
import { useTheme } from "@/theme/ThemeProvider";
import { categoryIcons } from "../categoryIcons";
import { useDeleteExpenseMutation, useGetExpenseQuery } from "../expensesApi";

const splitLabels = { EQUAL: "Equal split", EXACT: "Exact amounts", PERCENTAGE: "Percentage split" };

export default function ExpenseDetailsScreen({ groupId, expenseId }: { groupId: string; expenseId: string }) {
  const { colors, surfaces } = useTheme();
  const { currentData, isFetching, isError, error, refetch } = useGetExpenseQuery(expenseId, { refetchOnMountOrArgChange: true });
  const { data: groups } = useGetMyGroupsQuery();
  const group = groups?.data.groups.find(item => item.id === groupId);
  const expense = !isError && currentData?.data.expense.groupId === groupId ? currentData.data.expense : undefined;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteExpense, { isLoading: deleting }] = useDeleteExpenseMutation();
  const deleteLock = useRef(false);
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));

  function back() {
    router.navigate({ pathname: "/groups/[groupId]/expenses", params: { groupId } });
  }
  function amount(value: number) {
    return `${group?.currency ? `${group.currency} ` : ""}${formatCurrencyAmount(value, group?.currency)}`;
  }
  async function remove() {
    if (deleteLock.current || !expense || isFetching) return;
    deleteLock.current = true;
    setMessage("");
    try {
      await deleteExpense({ groupId, expenseId }).unwrap();
      router.navigate({ pathname: "/groups/[groupId]/expenses", params: { groupId, category: "", startDate: "", endDate: "", filterRequest: String(Date.now()) } });
    } catch (cause) {
      setMessage(authError(cause, "Could not delete the expense. Try again."));
    } finally {
      deleteLock.current = false;
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} className="flex-1 bg-background">
      <ScreenBackground />
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        refreshControl={<RefreshControl refreshing={isFetching && !!expense} onRefresh={() => { if (!isFetching && !deleting) void refetch(); }} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View className="flex-row items-center gap-3">
          <Button variant="outline" size="icon" accessibilityLabel="Back to expenses" disabled={deleting} onPress={back}>
            <Ionicons name="chevron-back" size={22} color={colors.foreground} accessible={false} />
          </Button>
          <Text accessibilityRole="header" className="flex-1 text-2xl font-semibold">Expense details</Text>
        </View>
        {!expense ? (
          isFetching ? <View className="items-center gap-3 py-12"><ActivityIndicator color={colors.primary} /><Text>Loading expense…</Text></View> : (
            isError ? <QueryErrorState error={error} subject="Expense" onRetry={() => void refetch()} onBack={back} backLabel="Back to expenses" /> : <ContentState icon="lock-closed-outline" title="Expense unavailable" description="This expense does not belong to the selected group." actionLabel="Back to expenses" onAction={back} />
          )
        ) : (
          <>
            <View className="gap-4 rounded-[24px] bg-card p-5" style={surfaces.card}>
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                  <Ionicons name={categoryIcons[expense.category] ?? categoryIcons.OTHERS} size={24} color={colors.primary} accessible={false} />
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-xl font-semibold">{expense.description}</Text>
                  <Text className="text-sm capitalize text-muted-foreground">{expense.category.toLowerCase()}</Text>
                </View>
              </View>
              <Text className="text-3xl font-semibold" style={{ fontVariant: ["tabular-nums"] }}>{amount(expense.amount)}</Text>
              <Text className="text-sm text-muted-foreground">{group?.name ?? "Group expense"} · {new Date(expense.date).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</Text>
              <View className="flex-row items-center gap-3 border-t border-border pt-4">
                <UserAvatar firstName={expense.paidBy?.firstName} lastName={expense.paidBy?.lastName} imageUrl={expense.paidBy?.avatar} size={40} />
                <View className="flex-1 gap-1">
                  <Text className="text-xs text-muted-foreground">Paid by</Text>
                  <Text className="font-semibold">{expense.paidBy ? `${expense.paidBy.firstName} ${expense.paidBy.lastName}` : "Unknown member"}</Text>
                </View>
              </View>
            </View>
            <View className="gap-4 rounded-[24px] bg-card p-5" style={surfaces.card}>
              <View className="gap-1">
                <Text accessibilityRole="header" className="text-lg font-semibold">How it’s split</Text>
                <Text className="text-sm text-muted-foreground">{splitLabels[expense.splitType]} · {expense.participants.length} {expense.participants.length === 1 ? "person" : "people"}</Text>
              </View>
              {expense.participants.map((participant, index) => (
                <View key={participant.userId?._id ?? `former-${index}`} className="gap-2 border-t border-border pt-3">
                  <View className="flex-row items-center gap-3">
                    <UserAvatar firstName={participant.userId?.firstName} lastName={participant.userId?.lastName} imageUrl={participant.userId?.avatar} size={34} />
                    <Text className="flex-1 text-sm">{participant.userId ? `${participant.userId.firstName} ${participant.userId.lastName}` : "Former member"}{participant.percentage != null ? ` (${participant.percentage}%)` : ""}</Text>
                  </View>
                  <Text className="ml-12 text-sm font-semibold">{amount(participant.amount)}</Text>
                </View>
              ))}
            </View>
            <View className="gap-2 rounded-[24px] bg-card p-5" style={surfaces.card}>
              <Text accessibilityRole="header" className="text-lg font-semibold">Notes</Text>
              <Text className="text-sm text-muted-foreground">{expense.notes?.trim() || "No notes added."}</Text>
            </View>
            <View className="gap-3">
              {confirmDelete ? (
                <View className="gap-4 rounded-[24px] border border-border bg-card p-5">
                  <Text className="font-semibold">Delete this expense?</Text>
                  <Text>Delete “{expense.description}” ({amount(expense.amount)})? This cannot be undone and will update group balances.</Text>
                  {message ? <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">{message}</Text> : null}
                  <Button variant="destructive" disabled={deleting || isFetching} onPress={() => void remove()}><Text>{deleting ? "Deleting…" : "Confirm delete"}</Text></Button>
                  <Button variant="outline" disabled={deleting} onPress={() => { setConfirmDelete(false); setMessage(""); }}><Text>Cancel</Text></Button>
                </View>
              ) : (
                <View className="flex-row flex-wrap gap-3">
                  <Button className="flex-1" disabled={deleting || isFetching} onPress={() => router.push({ pathname: "/groups/[groupId]/expenses/[expenseId]/edit", params: { groupId, expenseId } })}>
                    <Ionicons name="create-outline" size={18} color={colors.primaryForeground} accessible={false} /><Text>Edit</Text>
                  </Button>
                  <Button variant="outline" className="flex-1" disabled={deleting || isFetching} onPress={() => { setConfirmDelete(true); setMessage(""); }}>
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} accessible={false} /><Text className="text-destructive">Delete</Text>
                  </Button>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
