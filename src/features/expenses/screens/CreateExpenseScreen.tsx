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
import { Text } from "@/components/ui/text";
import { authError } from "@/features/auth/errors";
import {
    useGetGroupMembersQuery,
    useGetMyGroupsQuery,
} from "@/features/groups/groupsApi";
import { useCreateExpenseMutation } from "../expensesApi";
import type { ExpenseCategory } from "../types";

const categories: ExpenseCategory[] = [
  "GROCERIES",
  "FOOD",
  "RENT",
  "UTILITIES",
  "INTERNET",
  "TRANSPORTATION",
  "HEALTHCARE",
  "ENTERTAINMENT",
  "SHOPPING",
  "OTHERS",
];

export default function CreateExpenseScreen({
  groupId,
}: {
  groupId: string;
}) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("OTHERS");
  const [paidBy, setPaidBy] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);

  const { data: groupsData } = useGetMyGroupsQuery();
  const group = groupsData?.data.groups.find(
    (item) => item.id === groupId,
  );

  const {
    data: membersData,
    isLoading: loadingMembers,
    isFetching: fetchingMembers,
    isError: membersError,
    refetch,
  } = useGetGroupMembersQuery(groupId);

  const members = (membersData?.data.members ?? []).flatMap(
    (member) => (member.userId ? [member.userId] : []),
  );

  const [createExpense, { isLoading: saving }] =
    useCreateExpenseMutation();

  function toggleParticipant(id: string) {
    setMessage("");
    setParticipantIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  function returnToExpenses() {
    router.replace({
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
      participantIds.some(
        (id) => !members.some((member) => member._id === id),
      )
    ) {
      setMessage("Choose at least one active participant.");
      return;
    }

    submitting.current = true;

    try {
      await createExpense({
        groupId,
        body: {
          description: description.trim(),
          amount: numericAmount,
          category,
          paidBy,
          splitType: "EQUAL",
          participants: participantIds.map((userId) => ({ userId })),
          notes: notes.trim(),
        },
      }).unwrap();

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
              <Text className="text-3xl font-semibold tracking-tight">
                Add expense
              </Text>
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
                    {categories.map((value) => (
                      <Button
                        key={value}
                        variant={category === value ? "default" : "outline"}
                        className="min-h-12 rounded-full"
                        disabled={saving}
                        accessibilityState={{ selected: category === value }}
                        onPress={() => setCategory(value)}
                      >
                        <Text className="capitalize">
                          {value.toLowerCase()}
                        </Text>
                      </Button>
                    ))}
                  </View>
                </View>

                <View className="gap-3 rounded-[24px] bg-card p-5">
                  <Text className="font-semibold">Paid by</Text>
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
                  <Text className="font-semibold">Split equally between</Text>
                  <Text className="text-sm text-muted-foreground">
                    Select everyone sharing this expense.
                  </Text>

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
                        <Text>
                          {selected ? "✓ " : ""}
                          {member.firstName} {member.lastName}
                        </Text>
                      </Button>
                    );
                  })}

                  <Text className="text-xs text-muted-foreground">
                    {participantIds.length} selected · Shares calculated on save
                  </Text>
                </View>

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