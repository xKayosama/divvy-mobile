import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormField, FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import DateField from "@/components/ui/date-field";
import { Text } from "@/components/ui/text";
import { authError } from "@/features/auth/errors";
import {
  useGetGroupMembersQuery,
  useGetMyGroupsQuery,
} from "@/features/groups/groupsApi";
import { useAppSelector } from "@/hooks/redux";
import { useTheme } from "@/theme/ThemeProvider";
import {
  createPaymentRequestId,
  localCalendarDate,
  validatePayment,
} from "../paymentForm";
import {
  useRecordSettlementMutation,
  useGetSettlementSuggestionsQuery,
} from "../settlementsApi";
import type { RecordPaymentRequest } from "../types";

export default function RecordPaymentScreen({
  groupId,
  initialTo = "",
  initialAmount = "",
}: {
  groupId: string;
  initialTo?: string;
  initialAmount?: string;
}) {
  const { colors } = useTheme();
  const user = useAppSelector((state) => state.auth.user);
  const membersQuery = useGetGroupMembersQuery(groupId, {
    refetchOnMountOrArgChange: true,
  });
  const { data: groups } = useGetMyGroupsQuery();
  const group = groups?.data.groups.find((item) => item.id === groupId);
  const members = (membersQuery.currentData?.data.members ?? []).flatMap(
    (member) =>
      member.status === "ACTIVE" && member.userId ? [member.userId] : [],
  );
  const suggestionsQuery = useGetSettlementSuggestionsQuery(groupId, {
    refetchOnMountOrArgChange: true,
  });
  const outstanding = (
    suggestionsQuery.currentData?.data.settlements ?? []
  ).filter((item) => item.from._id === user?.id);
  const recipients = members.filter(
    (member) =>
      member._id !== user?.id &&
      outstanding.some((item) => item.to._id === member._id),
  );
  const loading = membersQuery.isLoading || suggestionsQuery.isLoading;
  const fetching = membersQuery.isFetching || suggestionsQuery.isFetching;
  const loadError = membersQuery.isError
    ? membersQuery.error
    : suggestionsQuery.isError
      ? suggestionsQuery.error
      : undefined;
  const [to, setTo] = useState(initialTo);
  const [amount, setAmount] = useState(initialAmount);
  const [date, setDate] = useState(() => localCalendarDate());
  const snapshot = JSON.stringify({ to, amount, date });
  const [initialSnapshot] = useState(snapshot);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function fieldError(field: string, text: string) {
    setFieldErrors({ [field]: text });
    setMessage("Check the highlighted field and try again.");
  }

  const [review, setReview] = useState<RecordPaymentRequest | null>(null);
  const [receipt, setReceipt] = useState<{
    recipient: string;
    amount: number;
    date: string;
  } | null>(null);
  const [recordPayment, { isLoading: saving }] = useRecordSettlementMutation();
  const submitting = useRef(false);
  const selected = members.find((member) => member._id === to);
  const format = (value: number) =>
    `${group?.currency ? `${group.currency} ` : ""}${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const unsaved = useUnsavedChanges(!receipt && (snapshot !== initialSnapshot || !!review || !!initialAmount), saving);

  function back() {
    unsaved.requestLeave(() => router.navigate({
      pathname: "/groups/[groupId]/settlements",
      params: { groupId },
    }));
  }
  function prepare() {
    setMessage("");
    if (!selected) {
      setMessage("Choose an active member to pay.");
      return;
    }
    if (!members.some((member) => member._id === user?.id)) {
      setMessage("You must be an active member to record a payment.");
      return;
    }
    const normalized = amount.trim().replace(",", ".");
    const error = validatePayment(normalized, date);
    if (error) {
      fieldError(error.includes("amount") ? "amount" : "date", error);
      return;
    }
    const remaining =
      outstanding.find((item) => item.to._id === to)?.amount ?? 0;
    if (
      Math.round(Number(normalized) * 100) > Math.round(remaining * 100) ||
      remaining <= 0
    ) {
      setMessage(
        "This repayment is settled or the amount exceeds what you still owe. Refresh payments.",
      );
      return;
    }
    Keyboard.dismiss();
    setReview({
      requestId: createPaymentRequestId(),
      to,
      amount: Number(normalized),
      paidAt: new Date(`${date}T00:00:00`).toISOString(),
    });
  }
  async function save() {
    if (submitting.current || !review || !selected || fetching || !!loadError)
      return;
    const error = validatePayment(String(review.amount), date);
    if (error) {
      setMessage(error);
      return;
    }
    Keyboard.dismiss();
    submitting.current = true;
    setMessage("");
    try {
      const fresh = await suggestionsQuery.refetch().unwrap();
      const remaining =
        fresh.data.settlements.find(
          (item) => item.from._id === user?.id && item.to._id === review.to,
        )?.amount ?? 0;
      if (
        remaining <= 0 ||
        Math.round(review.amount * 100) > Math.round(remaining * 100)
      ) {
        setMessage(
          "This repayment is already settled or its outstanding amount changed. Go back to payments for the latest balance.",
        );
        return;
      }
      await recordPayment({ groupId, body: review }).unwrap();
      setReceipt({
        recipient: `${selected.firstName} ${selected.lastName}`,
        amount: review.amount,
        date,
      });
    } catch (error) {
      setMessage(
        authError(
          error,
          "Could not confirm the payment was saved. Check payment history before retrying.",
        ),
      );
    } finally {
      submitting.current = false;
    }
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 20, gap: 24, flexGrow: 1 }}
        >
          {receipt ? (
            <View className="flex-1 justify-center gap-6 py-8">
              <View className="items-center gap-4">
                <View className="h-20 w-20 items-center justify-center rounded-full bg-secondary">
                  <Ionicons
                    name="checkmark-circle"
                    size={48}
                    color={colors.primary}
                    accessible={false}
                  />
                </View>
                <Text
                  accessibilityLiveRegion="polite"
                  className="text-center text-3xl font-semibold"
                >
                  Payment recorded
                </Text>
                <Text className="text-center text-muted-foreground">
                  Your group balances have been updated.
                </Text>
              </View>
              <View className="gap-3 rounded-[24px] bg-card p-5">
                <Text className="text-3xl font-semibold text-primary">
                  {format(receipt.amount)}
                </Text>
                <Text>From you to {receipt.recipient}</Text>
                <Text className="text-sm text-muted-foreground">
                  Paid {receipt.date}
                </Text>
              </View>
              <Button onPress={back}>
                <Text>View payments</Text>
              </Button>
            </View>
          ) : (
            <>
              <Text className="text-3xl font-semibold">
                {review ? "Confirm payment" : "Record payment"}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                Record a repayment you already sent. Divvy does not move money.
              </Text>
              {loading ? (
                <ActivityIndicator accessibilityLabel="Loading members" />
              ) : loadError ? (
                <View className="gap-3">
                  <Text accessibilityLiveRegion="polite">
                    {authError(
                      loadError,
                      "Unable to load outstanding repayments.",
                    )}
                  </Text>
                  <Button
                    disabled={fetching}
                    onPress={() => {
                      void membersQuery.refetch();
                      void suggestionsQuery.refetch();
                    }}
                  >
                    <Text>Retry</Text>
                  </Button>
                </View>
              ) : review ? (
                <>
                  <View className="gap-4 rounded-[24px] bg-card p-5">
                    <Text className="text-3xl font-semibold text-primary">
                      {format(review.amount)}
                    </Text>
                    <Text>
                      From: {user?.firstName} {user?.lastName} (you)
                    </Text>
                    <Text>
                      To:{" "}
                      {selected
                        ? `${selected.firstName} ${selected.lastName}`
                        : "Recipient no longer available"}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      Payment date: {date}
                    </Text>
                  </View>
                  <Text className="text-sm text-muted-foreground">
                    Confirm that this payment has already been made. Saving it
                    changes your group balances.
                  </Text>
                  <FormMessage message={message} />
                  <Button
                    disabled={saving || fetching || !selected}
                    onPress={() => void save()}
                  >
                    <Text>{saving ? "Saving…" : "Confirm payment"}</Text>
                  </Button>
                  <Button
                    variant="outline"
                    disabled={saving}
                    onPress={() => {
                      setReview(null);
                      setMessage("");
                    }}
                  >
                    <Text>Edit details</Text>
                  </Button>
                </>
              ) : (
                <>
                  <Text className="text-sm text-muted-foreground">
                    From: {user?.firstName} {user?.lastName} (you)
                  </Text>
                  <View className="gap-3">
                    <Text className="font-semibold">Who did you pay?</Text>
                    {recipients.map((member) => (
                      <Button
                        key={member._id}
                        variant={to === member._id ? "default" : "outline"}
                        accessibilityState={{ selected: to === member._id }}
                        onPress={() => setTo(member._id)}
                      >
                        <Text>
                          {member.firstName} {member.lastName}
                        </Text>
                      </Button>
                    ))}
                    {recipients.length === 0 ? (
                      <Text className="text-muted-foreground">
                        You have no outstanding repayments. No additional
                        payment is needed.
                      </Text>
                    ) : null}
                  </View>
                  {outstanding.find((item) => item.to._id === to) ? (
                    <Text className="text-sm text-muted-foreground">
                      Still to pay:{" "}
                      {format(
                        outstanding.find((item) => item.to._id === to)!.amount,
                      )}
                    </Text>
                  ) : null}
                  <FormField
                    label={`Amount${group ? ` (${group.currency})` : ""}`}
                    icon="cash-outline"
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    value={amount}
              error={fieldErrors.amount}
                    onChangeText={value => { setAmount(value); setFieldErrors({}); setMessage(""); }}
                  />
                  <DateField
                    label="Payment date"
                    value={date}
              error={fieldErrors.date}
                    onChange={value => { setDate(value); setFieldErrors({}); setMessage(""); }}
                  />
                  <FormMessage message={message} />
                  <Button
                    disabled={fetching || recipients.length === 0}
                    onPress={prepare}
                  >
                    <Text>Review payment</Text>
                  </Button>
                </>
              )}
              <Button variant="ghost" disabled={saving} onPress={back}>
                <Text>Back to payments</Text>
              </Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      {unsaved.dialog}
    </SafeAreaView>
  );
}
