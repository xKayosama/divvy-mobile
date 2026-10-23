import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
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
import { billCategories } from "../billForm";
import BillStatusBadge from "../components/BillStatusBadge";
import { useDeleteBillMutation, useGetBillQuery } from "../billsApi";

const recurrenceLabels = { WEEKLY: "Every week", MONTHLY: "Every month", YEARLY: "Every year" };

export default function BillDetailsScreen({ groupId, billId }: { groupId: string; billId: string }) {
  const { colors, surfaces } = useTheme();
  const { currentData, isFetching, isError, error, refetch } = useGetBillQuery(billId, { refetchOnMountOrArgChange: true });
  const { data: groups } = useGetMyGroupsQuery();
  const group = groups?.data.groups.find(item => item.id === groupId);
  const bill = !isError && currentData?.data.bill.groupId === groupId ? currentData.data.bill : undefined;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteBill, { isLoading: deleting }] = useDeleteBillMutation();
  const deleteLock = useRef(false);
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));

  function back() {
    router.navigate({ pathname: "/groups/[groupId]/bills", params: { groupId } });
  }
  function amount(value: number) {
    return `${group?.currency ? `${group.currency} ` : ""}${formatCurrencyAmount(value, group?.currency)}`;
  }
  function closeDelete() {
    if (deleteLock.current || deleting) return;
    setConfirmDelete(false);
    setMessage("");
  }
  async function remove() {
    if (deleteLock.current || !confirmDelete || !bill || bill.status === "PAID" || bill.paymentPending || isFetching) return;
    deleteLock.current = true;
    setMessage("");
    try {
      await deleteBill({ groupId, billId }).unwrap();
      setConfirmDelete(false);
      router.navigate({ pathname: "/groups/[groupId]/bills", params: { groupId, status: "", filterRequest: String(Date.now()) } });
    } catch (cause) {
      setMessage(authError(cause, "Could not delete the bill. Try again."));
    } finally {
      deleteLock.current = false;
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} className="flex-1 bg-background">
      <ScreenBackground />
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        refreshControl={<RefreshControl refreshing={isFetching && !!bill} onRefresh={() => { if (!isFetching && !deleting) void refetch(); }} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View className="flex-row items-center gap-3">
          <Button variant="outline" size="icon" accessibilityLabel="Back to upcoming bills" disabled={deleting} onPress={back}>
            <Ionicons name="chevron-back" size={22} color={colors.foreground} accessible={false} />
          </Button>
          <Text accessibilityRole="header" className="flex-1 text-2xl font-semibold">Bill details</Text>
        </View>
        {!bill ? (
          isFetching ? <View className="items-center gap-3 py-12"><ActivityIndicator color={colors.primary} /><Text>Loading bill…</Text></View> : (
            isError ? <QueryErrorState error={error} subject="Bill" onRetry={() => void refetch()} onBack={back} backLabel="Back to upcoming bills" /> : <ContentState icon="lock-closed-outline" title="Bill unavailable" description="This bill does not belong to the selected group." actionLabel="Back to upcoming bills" onAction={back} />
          )
        ) : (
          <>
            <View className="gap-4 rounded-[24px] bg-card p-5" style={surfaces.card}>
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
                  <Ionicons name={billCategories[bill.category] ?? billCategories.OTHER} size={24} color={colors.primary} accessible={false} />
                </View>
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-xl font-semibold">{bill.name}</Text>
                  <Text className="text-sm capitalize text-muted-foreground">{bill.category.toLowerCase().replace(/_/g, " ")}</Text>
                </View>
              </View>
              <BillStatusBadge status={bill.status} />
              <Text className="text-3xl font-semibold" style={{ fontVariant: ["tabular-nums"] }}>{amount(bill.amount)}</Text>
              <Text className="text-sm text-muted-foreground">{group?.name ?? "Group bill"} · Due {new Date(bill.dueDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</Text>
            </View>
            <View className="gap-3 rounded-[24px] bg-card p-5" style={surfaces.card}>
              <Text accessibilityRole="header" className="text-lg font-semibold">Schedule</Text>
              <Text className="text-sm text-muted-foreground">{bill.isRecurring && bill.recurrence ? recurrenceLabels[bill.recurrence] : bill.recurrenceSourceId ? "Part of a recurring bill" : "One-time bill"}</Text>
              {bill.recurrenceSourceId && bill.occurrenceNumber ? <Text className="text-sm text-muted-foreground">Occurrence {bill.occurrenceNumber}</Text> : null}
            </View>
            {bill.status === "PAID" ? (
              <View className="gap-3 rounded-[24px] bg-card p-5" style={surfaces.card}>
                <Text accessibilityRole="header" className="text-lg font-semibold">Payment recorded</Text>
                <View className="flex-row items-center gap-3">
                  <UserAvatar firstName={bill.paidBy?.firstName} lastName={bill.paidBy?.lastName} imageUrl={bill.paidBy?.avatar} size={40} />
                  <View className="flex-1 gap-1">
                    <Text className="text-xs text-muted-foreground">Paid by</Text>
                    <Text className="font-semibold">{bill.paidBy ? `${bill.paidBy.firstName} ${bill.paidBy.lastName}`.trim() || "Unknown member" : "Unknown member"}</Text>
                  </View>
                </View>
                <Text className="text-sm text-muted-foreground">{bill.paidAt && Number.isFinite(new Date(bill.paidAt).getTime()) ? new Date(bill.paidAt).toLocaleString("en-PH", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Payment date unavailable"}</Text>
                <Text className="text-xs text-muted-foreground">This is when payment was recorded.</Text>
                {bill.expenseId ? <><Text className="text-sm text-muted-foreground">Included once in spending and balances through its linked expense.</Text><Button variant="outline" onPress={()=>router.push({pathname:"/groups/[groupId]/expenses/[expenseId]",params:{groupId,expenseId:bill.expenseId!}})}><Text>View linked expense</Text></Button></> : <Text className="text-sm text-muted-foreground">This older payment has no linked expense and does not affect member balances. Check existing expenses before adding anything manually.</Text>}
              </View>
            ) : null}
            <View className="gap-2 rounded-[24px] bg-card p-5" style={surfaces.card}>
              <Text accessibilityRole="header" className="text-lg font-semibold">Notes</Text>
              <Text className="text-sm text-muted-foreground">{bill.notes?.trim() || "No notes added."}</Text>
            </View>
            {bill.status === "PAID" ? (
              <View className="flex-row items-center gap-2">
                <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} accessible={false} />
                <Text className="flex-1 text-sm text-muted-foreground">Paid bills cannot be edited or deleted.</Text>
              </View>
            ) : <View className="gap-3">
              <Button disabled={deleting || isFetching} onPress={() => router.push({ pathname: "/groups/[groupId]/bills/[billId]/pay", params: { groupId, billId } })}><Text>{bill.paymentPending?"Finish saved payment":"Mark as paid"}</Text></Button>
              {bill.paymentPending?<Text className="text-sm text-muted-foreground">Payment is processing. Its saved payer and split are locked; retry to finish safely.</Text>:null}
                <View className="flex-row flex-wrap gap-3">
                  <Button className="flex-1" disabled={deleting || isFetching || bill.paymentPending} onPress={() => router.push({ pathname: "/groups/[groupId]/bills/[billId]/edit", params: { groupId, billId } })}>
                    <Ionicons name="create-outline" size={18} color={colors.primaryForeground} accessible={false} /><Text>Edit</Text>
                  </Button>
                  <Button variant="outline" className="flex-1" disabled={deleting || isFetching || bill.paymentPending} onPress={() => { if(bill.paymentPending)return; setConfirmDelete(true); setMessage(""); }}>
                    <Ionicons name="trash-outline" size={18} color={colors.destructive} accessible={false} /><Text className="text-destructive">Delete</Text>
                  </Button>
                </View>
            </View>}
          </>
        )}
      </ScrollView>
      <DeleteConfirmationModal
        visible={confirmDelete && !!bill && bill.status !== "PAID" && !bill.paymentPending}
        title="Delete bill?"
        name={bill?.name ?? ""}
        detail={bill ? amount(bill.amount) : ""}
        message={message}
        busy={deleting}
        disabled={isFetching}
        confirmLabel="Delete bill"
        cancelLabel="Keep bill"
        onClose={closeDelete}
        onConfirm={() => void remove()}
      >
        <Text className="text-sm text-muted-foreground">This cannot be undone.</Text>
        <Text className="text-sm text-muted-foreground">{bill?.isRecurring ? "This stops future generation. Bills already generated remain unchanged." : bill?.recurrenceSourceId ? "Only this occurrence will be removed. The recurring schedule continues." : "This removes the bill from your group."}</Text>
      </DeleteConfirmationModal>
    </SafeAreaView>
  );
}
