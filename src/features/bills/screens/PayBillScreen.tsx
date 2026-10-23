import Ionicons from "@expo/vector-icons/Ionicons";
import { FormField, FormMessage } from "@/components/auth/FormField";
import { useAppSelector } from "@/hooks/redux";
import { useTheme } from "@/theme/ThemeProvider";
import { ExpenseMemberSelector } from "@/features/expenses/components/ExpenseMemberSelector";
import { splitPreview } from "@/features/expenses/splitPreview";
import { currencyScale, formatCurrencyAmount } from "@/features/groups/money";
import { billPaymentBody } from "../paymentForm";
import type { BillPaymentSplit } from "../types";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const { colors } = useTheme();
  const [payer, setPaidBy] = useState("");
  const paidBy =
    payer ||
    (members.some((member) => member._id === currentUserId)
      ? currentUserId!
      : "");
  const [selected, setSelected] = useState<string[] | null>(null);
  const ids = selected ?? members.map((member) => member._id);
  const [splitType, setSplitType] = useState<BillPaymentSplit>("EQUAL");
  const [values, setValues] = useState<Record<string, string>>({});
  const effective =
    splitType === "SHARES"
      ? Object.fromEntries(ids.map((id) => [id, values[id] ?? "1"]))
      : values;
  const preview = splitPreview(
    String(bill?.amount ?? ""),
    splitType,
    ids,
    effective,
    currency ?? "PHP",
  );
  const splitLabels = {
    EQUAL: "Equally",
    EXACT: "By amount",
    PERCENTAGE: "By percent",
    SHARES: "By shares",
  };
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
    if (
      !bill.paymentPending &&
      (!currency ||
        ids.some((id) => !members.some((member) => member._id === id)))
    ) {
      setMessage("Reload the group and choose active participants.");
      return;
    }
    const result = bill.paymentPending
      ? { body: { resume: true as const }, error: "" }
      : billPaymentBody(
          bill.amount,
          currency ?? "PHP",
          paidBy,
          splitType,
          ids,
          values,
        );
    if (result.error || !result.body) {
      setMessage(result.error);
      return;
    }
    if (
      !bill.paymentPending &&
      !members.some((member) => member._id === paidBy)
    ) {
      setMessage("Choose the active member who paid this bill.");
      return;
    }
    submitting.current = true;
    setMessage("");
    try {
      await markPaid({ groupId, billId, body: result.body }).unwrap();
      router.navigate({
        pathname: "/groups/[groupId]/bills/[billId]",
        params: { groupId, billId },
      });
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
            {bill.paymentPending ? (
              <Text className="text-sm text-muted-foreground">
                Your payment is being finished with its saved payer and split.
                Retry safely; this creates no second expense.
              </Text>
            ) : (
              <>
                <ExpenseMemberSelector
                  mode="single"
                  members={members}
                  currentUserId={currentUserId}
                  value={paidBy}
                  onChange={setPaidBy}
                  disabled={saving}
                />
                <ExpenseMemberSelector
                  mode="multiple"
                  members={members}
                  currentUserId={currentUserId}
                  value={ids}
                  onChange={setSelected}
                  disabled={saving}
                />
                <View className="flex-row flex-wrap gap-2">
                  {(["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const).map(
                    (type) => (
                      <Button
                        key={type}
                        variant={splitType === type ? "default" : "outline"}
                        disabled={saving}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: splitType === type }}
                        onPress={() => {
                          setSplitType(type);
                          setValues({});
                          setMessage("");
                        }}
                      >
                        <Ionicons
                          name={
                            type === "EQUAL"
                              ? "people-outline"
                              : type === "SHARES"
                                ? "layers-outline"
                                : type === "EXACT"
                                  ? "cash-outline"
                                  : "pie-chart-outline"
                          }
                          size={18}
                          color={
                            splitType === type
                              ? colors.primaryForeground
                              : colors.primary
                          }
                          accessible={false}
                        />
                        <Text>{splitLabels[type]}</Text>
                      </Button>
                    ),
                  )}
                </View>
                {splitType !== "EQUAL"
                  ? ids.map((id) => (
                      <FormField
                        key={id}
                        label={`${members.find((member) => member._id === id)?.firstName ?? "Member"} ${members.find((member) => member._id === id)?.lastName ?? ""}${splitType === "PERCENTAGE" ? " (%)" : splitType === "SHARES" ? " (shares)" : ""}`}
                        icon={
                          splitType === "SHARES"
                            ? "layers-outline"
                            : "cash-outline"
                        }
                        keyboardType={
                          splitType === "SHARES" ? "number-pad" : "decimal-pad"
                        }
                        placeholder={splitType === "SHARES" ? "1" : "0"}
                        value={effective[id] ?? ""}
                        editable={!saving}
                        onChangeText={(value) => {
                          setValues((current) => ({ ...current, [id]: value }));
                          setMessage("");
                        }}
                      />
                    ))
                  : null}
                <Text className="text-sm text-muted-foreground">
                  {splitType === "SHARES"
                    ? "Use whole-number weights, such as 2 shares and 1 share for a 2:1 split."
                    : splitType === "EQUAL"
                      ? "Split equally among the selected members."
                      : splitType === "EXACT"
                        ? "Amounts must match the bill total."
                        : "Percentages must add up to 100%."}
                </Text>
                {preview?.complete ? (
                  <View className="gap-2 rounded-[24px] bg-secondary p-4">
                    <Text className="font-semibold">Each member owes</Text>
                    {ids.map((id, index) => (
                      <Text key={id}>
                        {members.find((member) => member._id === id)?.firstName}
                        : {currency}{" "}
                        {formatCurrencyAmount(
                          (preview.amounts[index] ?? 0) /
                            currencyScale(currency),
                          currency,
                        )}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </>
            )}
            <Text className="text-sm text-muted-foreground">
              Confirm the bill has already been paid. One linked expense will
              record this payer and split in spending and member balances. This
              does not transfer money.
            </Text>
            <FormMessage message={message} />
            <Button
              disabled={
                saving ||
                fetching ||
                (!bill.paymentPending &&
                  (!paidBy ||
                    !preview?.complete ||
                    members.length === 0 ||
                    !currency))
              }
              onPress={() => void save()}
            >
              <Text>
                {saving
                  ? "Recording…"
                  : bill.paymentPending
                    ? "Finish saved payment"
                    : "Confirm paid & create expense"}
              </Text>
            </Button>
          </>
        )}
        <Button variant="ghost" disabled={saving} onPress={back}>
          <Text>Back to upcoming bills</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
