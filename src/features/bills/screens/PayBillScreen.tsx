import { formatCurrencyAmount } from "@/features/groups/money";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { authError } from "@/features/auth/errors";
import {
  useGetGroupMembersQuery,
  useGetMyGroupsQuery,
} from "@/features/groups/groupsApi";
import { useGetBillQuery, useMarkBillPaidMutation } from "../billsApi";

export default function PayBillScreen({
  groupId,
  billId,
}: {
  groupId: string;
  billId: string;
}) {
  const billQuery = useGetBillQuery(billId, {
    refetchOnMountOrArgChange: true,
  });
  const membersQuery = useGetGroupMembersQuery(groupId, {
    refetchOnMountOrArgChange: true,
  });
  const { data: groupsData } = useGetMyGroupsQuery();
  const currency = groupsData?.data.groups.find(
    (group) => group.id === groupId,
  )?.currency;
  const bill = billQuery.currentData?.data.bill;
  const members = (membersQuery.currentData?.data.members ?? []).flatMap(
    (member) =>
      member.status === "ACTIVE" && member.userId ? [member.userId] : [],
  );
  const [paidBy, setPaidBy] = useState("");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const [markPaid, { isLoading: saving }] = useMarkBillPaidMutation();
  const loading = billQuery.isLoading || membersQuery.isLoading;
  const fetching = billQuery.isFetching || membersQuery.isFetching;
  const error = billQuery.isError
    ? billQuery.error
    : membersQuery.isError
      ? membersQuery.error
      : undefined;
  function back() {
    router.navigate({
      pathname: "/groups/[groupId]/bills",
      params: { groupId },
    });
  }

  async function save() {
    if (submitting.current || fetching) return;
    if (!bill || bill.groupId !== groupId || bill.status === "PAID") return;
    if (!members.some((member) => member._id === paidBy)) {
      setMessage("Choose the active member who paid this bill.");
      return;
    }
    submitting.current = true;
    setMessage("");
    try {
      await markPaid({ groupId, billId, paidBy }).unwrap();
      back();
    } catch (error) {
      setMessage(
        authError(error, "Could not mark this bill as paid. Try again."),
      );
    } finally {
      submitting.current = false;
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Text className="text-3xl font-semibold">Record payment</Text>
        {loading ? (
          <ActivityIndicator accessibilityLabel="Loading bill and members" />
        ) : error ? (
          <View className="gap-3">
            <Text accessibilityLiveRegion="polite">
              {authError(error, "Unable to load this bill or group members.")}
            </Text>
            <Button
              disabled={fetching}
              onPress={() => {
                void billQuery.refetch();
                void membersQuery.refetch();
              }}
            >
              <Text>Retry</Text>
            </Button>
          </View>
        ) : !bill || bill.groupId !== groupId ? (
          <Text>This bill does not belong to this group.</Text>
        ) : bill.status === "PAID" ? (
          <Text accessibilityLiveRegion="polite">
            This bill is already paid.
          </Text>
        ) : (
          <>
            <View className="gap-2 rounded-[24px] bg-card p-5">
              <Text className="text-lg font-semibold">{bill.name}</Text>
              <Text className="text-3xl font-semibold">
                {currency ? `${currency} ` : ""}
                {formatCurrencyAmount(bill.amount, currency)}
              </Text>
              <Text className="text-sm text-muted-foreground">
                Due{" "}
                {new Date(bill.dueDate).toLocaleDateString("en-PH", {
                  timeZone: "UTC",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
            <Text className="font-semibold">Who paid?</Text>
            <View className="gap-3">
              {members.map((member) => (
                <Button
                  key={member._id}
                  variant={paidBy === member._id ? "default" : "outline"}
                  disabled={saving}
                  accessibilityState={{ selected: paidBy === member._id }}
                  onPress={() => setPaidBy(member._id)}
                >
                  <Text>
                    {member.firstName} {member.lastName}
                  </Text>
                </Button>
              ))}
              {members.length === 0 ? (
                <Text>No active members available. Reload to try again.</Text>
              ) : null}
            </View>
            <Text className="text-sm text-muted-foreground">
              Confirm this bill has already been paid. This records its status
              and payer; it does not transfer money or split the cost between
              members.
            </Text>
            <FormMessage message={message} />
            <Button
              disabled={saving || fetching || !paidBy || members.length === 0}
              onPress={() => void save()}
            >
              <Text>{saving ? "Saving…" : "Confirm paid"}</Text>
            </Button>
          </>
        )}
        <Button variant="ghost" disabled={saving} onPress={back}>
          <Text>Back to bills</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
