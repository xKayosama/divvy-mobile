import { FormField, FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import DateField from "@/components/ui/date-field";
import { Text } from "@/components/ui/text";
import { authError } from "@/features/auth/errors";
import { useGetMyGroupsQuery } from "@/features/groups/groupsApi";
import { useTheme } from "@/theme/ThemeProvider";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { billCategories, validateBillForm } from "../billForm";
import { useCreateBillMutation, useUpdateBillMutation } from "../billsApi";
import type {
  Bill,
  BillCategory,
  BillRecurrence,
  CreateBillRequest,
} from "../types";

export default function CreateBillScreen({
  groupId,
  bill,
}: {
  groupId: string;
  bill?: Bill;
}) {
  const { colors } = useTheme();
  const [name, setName] = useState(bill?.name ?? "");
  const [amount, setAmount] = useState(bill ? String(bill.amount) : "");
  const [dueDate, setDueDate] = useState(bill?.dueDate.slice(0, 10) ?? "");
  const [category, setCategory] = useState<BillCategory>(
    bill?.category ?? "OTHER",
  );
  const [recurrence, setRecurrence] = useState<BillRecurrence | null>(
    bill?.isRecurring ? bill.recurrence : null,
  );
  const [notes, setNotes] = useState(bill?.notes ?? "");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  const [createBill, { isLoading: creating }] = useCreateBillMutation();
  const [updateBill, { isLoading: updating }] = useUpdateBillMutation();
  const saving = creating || updating;
  const { data } = useGetMyGroupsQuery();
  const group = data?.data.groups.find((item) => item.id === groupId);
  function back() {
    router.navigate({
      pathname: "/groups/[groupId]/bills",
      params: { groupId },
    });
  }

  async function save() {
    if (submitting.current) return;
    const normalizedAmount = amount.trim().replace(",", ".");
    const normalizedDate = dueDate.trim();
    const error = validateBillForm(name, normalizedAmount, normalizedDate);
    setMessage(error);
    if (error) return;
    submitting.current = true;
    try {
      if (bill?.status === "PAID") {
        setMessage("Paid bills cannot be edited.");
        return;
      }
      const body: CreateBillRequest = {
        name: name.trim(),
        amount: Number(normalizedAmount),
        category,
        dueDate:
          bill && normalizedDate === bill.dueDate.slice(0, 10)
            ? bill.dueDate
            : `${normalizedDate}T00:00:00.000Z`,
        notes: notes.trim(),
        ...(recurrence
          ? { isRecurring: true as const, recurrence }
          : { isRecurring: false as const, recurrence: null }),
      };
      if (bill) await updateBill({ groupId, billId: bill._id, body }).unwrap();
      else await createBill({ groupId, body }).unwrap();
      back();
    } catch (error) {
      setMessage(authError(error, "Could not save the bill. Try again."));
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
          contentContainerStyle={{ padding: 20, gap: 24 }}
        >
          <View className="gap-2">
            <View className="flex-row items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                accessibilityLabel="Back to bills"
                disabled={saving}
                onPress={back}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={colors.foreground}
                  accessible={false}
                />
              </Button>
              <Text className="text-3xl font-semibold">
                {bill ? "Edit bill" : "Add bill"}
              </Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              {group?.name ?? "Your group"}
              {group ? ` · ${group.currency}` : ""}
            </Text>
          </View>
          <View className="gap-5 rounded-[24px] bg-card p-5">
            <FormField
              label="Bill name"
              icon="document-text-outline"
              placeholder="e.g. Electricity bill"
              value={name}
              onChangeText={setName}
              editable={!saving}
            />
            <FormField
              label={`Amount${group ? ` (${group.currency})` : ""}`}
              icon="cash-outline"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              editable={!saving}
            />
            <DateField
              label="Due date"
              value={dueDate}
              onChange={setDueDate}
              disabled={saving}
            />
          </View>
          <View className="gap-3">
            <Text className="font-semibold">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {(Object.keys(billCategories) as BillCategory[]).map((value) => (
                <Button
                  key={value}
                  variant={category === value ? "default" : "outline"}
                  disabled={saving}
                  accessibilityState={{ selected: category === value }}
                  onPress={() => setCategory(value)}
                >
                  <Ionicons
                    name={billCategories[value]}
                    size={18}
                    color={
                      category === value
                        ? colors.primaryForeground
                        : colors.foreground
                    }
                    accessible={false}
                  />
                  <Text className="capitalize">{value.toLowerCase()}</Text>
                </Button>
              ))}
            </View>
          </View>
          {bill?.recurrenceSourceId ? (
            <Text className="text-sm text-muted-foreground">
              This is one occurrence of a recurring bill. Changes apply to this
              occurrence only.
            </Text>
          ) : (
            <View className="gap-3">
              <Text className="font-semibold">Does this bill repeat?</Text>
              <View className="flex-row flex-wrap gap-2">
                {([false, true] as const).map((recurring) => (
                  <Button
                    key={String(recurring)}
                    variant={
                      Boolean(recurrence) === recurring ? "default" : "outline"
                    }
                    disabled={saving}
                    accessibilityState={{
                      selected: Boolean(recurrence) === recurring,
                    }}
                    onPress={() => setRecurrence(recurring ? "MONTHLY" : null)}
                  >
                    <Ionicons
                      name={recurring ? "repeat-outline" : "calendar-outline"}
                      size={18}
                      color={
                        Boolean(recurrence) === recurring
                          ? colors.primaryForeground
                          : colors.foreground
                      }
                      accessible={false}
                    />
                    <Text>
                      {recurring ? "Recurring bill" : "One-time bill"}
                    </Text>
                  </Button>
                ))}
              </View>
              {recurrence ? (
                <View className="gap-3 rounded-2xl border border-border bg-card p-4">
                  <Text className="font-semibold">How often?</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(["WEEKLY", "MONTHLY", "YEARLY"] as const).map((value) => (
                      <Button
                        key={value}
                        variant={recurrence === value ? "default" : "outline"}
                        disabled={saving}
                        accessibilityState={{ selected: recurrence === value }}
                        onPress={() => setRecurrence(value)}
                      >
                        <Text>
                          {value === "WEEKLY"
                            ? "Every week"
                            : value === "MONTHLY"
                              ? "Every month"
                              : "Every year"}
                        </Text>
                      </Button>
                    ))}
                  </View>
                  <Text className="text-sm text-muted-foreground">
                    {`A new bill will be created ${recurrence === "WEEKLY" ? "every week" : recurrence === "MONTHLY" ? "every month" : "every year"}${dueDate ? ` starting from ${new Date(`${dueDate}T12:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}` : " starting from the due date you choose"}. Each bill must be marked as paid separately.`}
                  </Text>
                </View>
              ) : (
                <Text className="text-sm text-muted-foreground">
                  You only need to pay this bill once. No repeat bills will be
                  created.
                </Text>
              )}
            </View>
          )}
          {bill?.isRecurring ? (
            <Text className="text-sm text-muted-foreground">
              Schedule changes affect future bills. Already generated bills
              remain unchanged.
            </Text>
          ) : null}
          <FormField
            label="Notes (optional)"
            icon="document-text-outline"
            placeholder="Account number or other details"
            value={notes}
            onChangeText={setNotes}
            editable={!saving}
          />
          <Text className="text-sm text-muted-foreground">
            {bill
              ? "Paid bills are locked and cannot be edited or deleted."
              : "This creates a pending bill. Record who paid when it has been paid."}
          </Text>
          <FormMessage message={message} />
          <Button disabled={saving} onPress={() => void save()}>
            <Text>{saving ? "Saving…" : "Save bill"}</Text>
          </Button>
          <Button variant="ghost" disabled={saving} onPress={back}>
            <Text>Cancel</Text>
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
