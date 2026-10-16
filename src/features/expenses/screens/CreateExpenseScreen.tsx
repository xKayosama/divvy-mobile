import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useTheme } from "@/theme/ThemeProvider";
import { categoryIcons } from "../categoryIcons";
import { expenseCategories } from "../filters";
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from "../expensesApi";
import type { CreateExpenseRequest, Expense, ExpenseCategory } from "../types";

function calendarDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default function CreateExpenseScreen({
  groupId,
  expense,
}: {
  groupId: string;
  expense?: Expense;
}) {
  const { colors } = useTheme();
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [category, setCategory] = useState<ExpenseCategory>(
    expense?.category ?? "OTHERS",
  );
  const [paidBy, setPaidBy] = useState(expense?.paidBy?._id ?? "");
  const [participantIds, setParticipantIds] = useState<string[]>(
    expense?.participants.map((p, i) => p.userId?._id ?? `missing:${i}`) ?? [],
  );
  const [splitType, setSplitType] = useState<"EQUAL" | "EXACT" | "PERCENTAGE">(
    expense?.splitType ?? "EQUAL",
  );
  const [shares, setShares] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      expense?.participants.map((p, i) => [
        p.userId?._id ?? `missing:${i}`,
        String(
          expense.splitType === "PERCENTAGE" ? (p.percentage ?? "") : p.amount,
        ),
      ]) ?? [],
    ),
  );
  const [date, setDate] = useState(() => {
    return calendarDate(expense ? new Date(expense.date) : new Date());
  });
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);

  const { data: groupsData } = useGetMyGroupsQuery();
  const group = groupsData?.data.groups.find((item) => item.id === groupId);

  const {
    data: membersData,
    isLoading: loadingMembers,
    isFetching: fetchingMembers,
    isError: membersError,
    refetch,
  } = useGetGroupMembersQuery(groupId);

  const members = (membersData?.data.members ?? []).flatMap((member) =>
    member.status === "ACTIVE" && member.userId ? [member.userId] : [],
  );

  const [createExpense, { isLoading: creating }] = useCreateExpenseMutation();
  const [updateExpense, { isLoading: updating }] = useUpdateExpenseMutation();
  const saving = creating || updating;
  const unavailableIds = participantIds.filter(
    (id) => !members.some((member) => member._id === id),
  );

  function toggleParticipant(id: string) {
    setMessage("");
    setParticipantIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function returnToExpenses() {
    router.navigate({
      pathname: "/groups/[groupId]/expenses",
      params: { groupId },
    });
  }

  async function handleSave() {
    if (submitting.current) return;

    setMessage("");

    const normalizedAmount = amount.trim().replace(",", ".");
    const numericAmount = Number(normalizedAmount);

    if (!description.trim()) {
      setMessage("Enter a description.");
      return;
    }

    if (
      !/^\d+(\.\d{1,2})?$/.test(normalizedAmount) ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setMessage("Enter an amount greater than zero, with up to two decimals.");
      return;
    }

    if (!members.some((member) => member._id === paidBy)) {
      setMessage("Choose who paid.");
      return;
    }

    if (
      participantIds.length === 0 ||
      participantIds.some((id) => !members.some((member) => member._id === id))
    ) {
      setMessage(
        "Choose at least one active participant and remove unavailable members.",
      );
      return;
    }

    const normalizedDate = date.trim();
    const expenseDate = new Date(`${normalizedDate}T12:00:00`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) ||
      !Number.isFinite(expenseDate.getTime()) ||
      expenseDate.getFullYear() !== Number(normalizedDate.slice(0, 4)) ||
      expenseDate.getMonth() + 1 !== Number(normalizedDate.slice(5, 7)) ||
      expenseDate.getDate() !== Number(normalizedDate.slice(8, 10))
    ) {
      setMessage("Enter a valid date in YYYY-MM-DD format.");
      return;
    }

    const fields = {
      description: description.trim(),
      amount: numericAmount,
      category,
      paidBy,
      date:
        expense && normalizedDate === calendarDate(new Date(expense.date))
          ? expense.date
          : expenseDate.toISOString(),
      notes: notes.trim(),
    };
    let body: CreateExpenseRequest;
    if (splitType === "EQUAL") {
      body = {
        ...fields,
        splitType,
        participants: participantIds.map((userId) => ({ userId })),
      };
    } else {
      const values = participantIds.map((id) =>
        (shares[id] ?? "").trim().replace(",", "."),
      );
      if (
        values.some(
          (value) =>
            !/^\d+(\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value)),
        )
      ) {
        setMessage(
          "Enter a nonnegative share for every selected member, with up to two decimals.",
        );
        return;
      }
      const total = values.reduce(
        (sum, value) => sum + Math.round(Number(value) * 100),
        0,
      );
      if (splitType === "EXACT") {
        if (total !== Math.round(numericAmount * 100)) {
          setMessage("Member amounts must add up to the expense amount.");
          return;
        }
        body = {
          ...fields,
          splitType,
          participants: participantIds.map((userId, index) => ({
            userId,
            amount: Number(values[index]),
          })),
        };
      } else {
        if (values.some((value) => Number(value) > 100) || total !== 10000) {
          setMessage(
            "Member percentages must be between 0 and 100 and total 100%.",
          );
          return;
        }
        body = {
          ...fields,
          splitType,
          participants: participantIds.map((userId, index) => ({
            userId,
            percentage: Number(values[index]),
          })),
        };
      }
    }

    submitting.current = true;

    try {
      if (expense) {
        await updateExpense({ groupId, expenseId: expense._id, body }).unwrap();
      } else {
        await createExpense({ groupId, body }).unwrap();
      }

      returnToExpenses();
    } catch (error) {
      setMessage(authError(error, "Could not save the expense."));
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        >
          <View className="gap-6">
            <View className="gap-2">
              <View className="flex-row items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  accessibilityLabel="Back to expenses"
                  disabled={saving}
                  onPress={returnToExpenses}
                >
                  <Ionicons
                    name="arrow-back"
                    size={22}
                    color={colors.foreground}
                    accessible={false}
                  />
                </Button>
                <Text className="flex-1 text-3xl font-semibold tracking-tight">
                  {expense ? "Edit expense" : "Add expense"}
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground">
                {group?.name ?? "Your group"}
                {group ? ` · ${group.currency}` : ""}
              </Text>
            </View>

            {loadingMembers ? (
              <ActivityIndicator accessibilityLabel="Loading members" />
            ) : membersError ? (
              <View className="gap-3">
                <Text>Unable to load group members.</Text>
                <Button
                  disabled={fetchingMembers}
                  onPress={() => void refetch()}
                >
                  <Text>Retry</Text>
                </Button>
              </View>
            ) : (
              <>
                <View className="gap-5 rounded-[24px] bg-card p-5">
                  <FormField
                    label="Description"
                    icon="receipt-outline"
                    placeholder="Weekly groceries"
                    value={description}
                    onChangeText={setDescription}
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
                </View>

                <View className="gap-3">
                  <Text className="font-semibold">Category</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {expenseCategories.map((value) => (
                      <Button
                        key={value}
                        variant={category === value ? "default" : "outline"}
                        className="min-h-12 rounded-full"
                        disabled={saving}
                        accessibilityState={{ selected: category === value }}
                        onPress={() => setCategory(value)}
                      >
                        <Ionicons
                          name={categoryIcons[value]}
                          size={18}
                          color={
                            category === value
                              ? colors.primaryForeground
                              : colors.foreground
                          }
                          accessible={false}
                        />
                        <Text className="capitalize">
                          {value.toLowerCase()}
                        </Text>
                      </Button>
                    ))}
                  </View>
                </View>

                <View className="gap-3 rounded-[24px] bg-card p-5">
                  <Text className="font-semibold">Paid by</Text>
                  {expense &&
                  !members.some((member) => member._id === paidBy) ? (
                    <Text className="text-sm text-muted-foreground">
                      The original payer is unavailable. Choose an active
                      member.
                    </Text>
                  ) : null}
                  {members.map((member) => (
                    <Button
                      key={member._id}
                      variant={paidBy === member._id ? "default" : "outline"}
                      className="min-h-12 h-auto rounded-2xl py-3"
                      disabled={saving}
                      accessibilityState={{ selected: paidBy === member._id }}
                      onPress={() => setPaidBy(member._id)}
                    >
                      <Text>
                        {member.firstName} {member.lastName}
                      </Text>
                    </Button>
                  ))}
                </View>

                <View className="gap-3 rounded-[24px] bg-card p-5">
                  <Text className="font-semibold">Split between</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(["EQUAL", "EXACT", "PERCENTAGE"] as const).map(
                      (value) => (
                        <Button
                          key={value}
                          variant={splitType === value ? "default" : "outline"}
                          className="min-h-12 h-auto grow rounded-2xl px-4 py-3"
                          disabled={saving}
                          accessibilityState={{ selected: splitType === value }}
                          onPress={() => {
                            if (value !== splitType) setShares({});
                            setSplitType(value);
                            setMessage("");
                          }}
                        >
                          <Text className="text-sm font-semibold">
                            {value === "EQUAL"
                              ? "Equally"
                              : value === "EXACT"
                                ? "By amount"
                                : "By percent"}
                          </Text>
                        </Button>
                      ),
                    )}
                  </View>
                  <Text className="text-sm text-muted-foreground">
                    Select everyone sharing this expense.
                  </Text>

                  {unavailableIds.map((id) => (
                    <Button
                      key={id}
                      variant="outline"
                      disabled={saving}
                      onPress={() => toggleParticipant(id)}
                    >
                      <Text>Remove unavailable participant</Text>
                    </Button>
                  ))}
                  {members.map((member) => {
                    const selected = participantIds.includes(member._id);

                    return (
                      <Button
                        key={member._id}
                        variant={selected ? "secondary" : "outline"}
                        className="min-h-12 h-auto rounded-2xl py-3"
                        disabled={saving}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        onPress={() => toggleParticipant(member._id)}
                      >
                        {selected ? (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={colors.secondaryForeground}
                            accessible={false}
                          />
                        ) : null}
                        <Text>
                          {member.firstName} {member.lastName}
                        </Text>
                      </Button>
                    );
                  })}

                  <Text className="text-xs text-muted-foreground">
                    {participantIds.length} selected
                    {splitType === "EQUAL"
                      ? " · Shares calculated on save"
                      : ""}
                  </Text>
                </View>

                {splitType !== "EQUAL" ? (
                  <View className="gap-4 rounded-[24px] bg-card p-5">
                    <Text className="font-semibold">
                      {splitType === "EXACT"
                        ? "Member amounts"
                        : "Member percentages"}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {splitType === "EXACT"
                        ? "Amounts must add up to the expense total."
                        : "Percentages must add up to 100%."}
                    </Text>
                    {participantIds.map((id) => {
                      const member = members.find((value) => value._id === id);
                      return (
                        <FormField
                          key={id}
                          label={`${member?.firstName ?? "Member"} ${member?.lastName ?? ""}${splitType === "PERCENTAGE" ? " (%)" : ""}`}
                          icon="cash-outline"
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          value={shares[id] ?? ""}
                          editable={!saving}
                          onChangeText={(value) =>
                            setShares((current) => ({
                              ...current,
                              [id]: value,
                            }))
                          }
                        />
                      );
                    })}
                  </View>
                ) : null}

                <DateField
                  label="Expense date"
                  value={date}
                  onChange={setDate}
                  disabled={saving}
                />

                <FormField
                  label="Notes"
                  icon="document-text-outline"
                  placeholder="Optional notes"
                  value={notes}
                  onChangeText={setNotes}
                  editable={!saving}
                />

                <FormMessage message={message} />

                <Button
                  className="h-14 rounded-2xl"
                  disabled={saving || members.length === 0}
                  onPress={handleSave}
                >
                  <Text>{saving ? "Saving…" : "Save expense"}</Text>
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              disabled={saving}
              onPress={returnToExpenses}
            >
              <Text>Cancel</Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
