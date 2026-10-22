import { parseShareWeight, MAX_SHARE_WEIGHT } from "../shareSplit";
import { ExpenseMemberSelector } from "../components/ExpenseMemberSelector";
import { ItemizedExpenseEditor } from "../components/ItemizedExpenseEditor";
import {
  emptyItem,
  existingItemDrafts,
  receiptItemDrafts,
  itemizedPreview,
  type ItemDraft,
} from "../itemized";
import { CategorySelector } from "@/components/ui/category-selector";
import {
  amountPrecisionLabel,
  currencyScale,
  formatCurrencyAmount,
  validAmount,
} from "@/features/groups/money";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
import type { TextInput } from "react-native";
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
import { receiptDraft } from "@/features/receipts/receiptDraft";
import type { ReceiptExtraction } from "@/features/receipts/types";
import { useAppSelector } from "@/hooks/redux";
import { useTheme } from "@/theme/ThemeProvider";
import { expenseCategoryOptions } from "../categoryIcons";
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from "../expensesApi";
import { splitPreview } from "../splitPreview";
import type { CreateExpenseRequest, Expense, ExpenseCategory } from "../types";

function calendarDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default function CreateExpenseScreen({
  groupId,
  expense,
  receipt,
  receiptImageUri,
}: {
  groupId: string;
  expense?: Expense;
  receipt?: ReceiptExtraction;
  receiptImageUri?: string;
}) {
  const { colors } = useTheme();
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const draft = receipt ? receiptDraft(receipt) : undefined;
  const [mode, setMode] = useState<"STANDARD" | "ITEMIZED">(
    expense?.splitType === "ITEMIZED" ? "ITEMIZED" : "STANDARD",
  );
  const [items, setItems] = useState<ItemDraft[]>(() =>
    expense?.splitType === "ITEMIZED"
      ? existingItemDrafts(expense.items ?? [])
      : receipt?.items.length
        ? receiptItemDrafts(receipt)
        : [emptyItem()],
  );
  const [receiptReviewed, setReceiptReviewed] = useState(false);
  const [description, setDescription] = useState(
    expense?.description ?? draft?.description ?? "",
  );
  const [amount, setAmount] = useState(
    expense ? String(expense.amount) : (draft?.amount ?? ""),
  );
  const [category, setCategory] = useState<ExpenseCategory>(
    expense?.category ?? "OTHERS",
  );
  const [paidBy, setPaidBy] = useState(
    expense ? (expense.paidBy?._id ?? "") : (currentUserId ?? ""),
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    expense?.participants.map((p, i) => p.userId?._id ?? `missing:${i}`) ?? [],
  );
  const [splitType, setSplitType] = useState<
    "EQUAL" | "EXACT" | "PERCENTAGE" | "SHARES"
  >(
    expense?.splitType === "ITEMIZED"
      ? "EQUAL"
      : (expense?.splitType ?? "EQUAL"),
  );
  const [shares, setShares] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      expense?.participants.map((p, i) => [
        p.userId?._id ?? `missing:${i}`,
        String(
          expense.splitType === "SHARES"
            ? (p.shares ?? 1)
            : expense.splitType === "PERCENTAGE"
              ? (p.percentage ?? "")
              : p.amount,
        ),
      ]) ?? [],
    ),
  );
  const [date, setDate] = useState(() => {
    return draft
      ? draft.date
      : calendarDate(expense ? new Date(expense.date) : new Date());
  });
  const [notes, setNotes] = useState(expense?.notes ?? draft?.notes ?? "");
  const snapshot = JSON.stringify({
    mode,
    items,
    description,
    amount,
    category,
    paidBy,
    participantIds,
    splitType,
    shares,
    date,
    notes,
    receiptReviewed,
  });
  const [initialSnapshot] = useState(snapshot);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function fieldError(field: string, text: string) {
    setFieldErrors({ [field]: text });
    setMessage("Check the highlighted field and try again.");
  }

  const submitting = useRef(false);
  const amountInput = useRef<TextInput>(null);

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
  const effectiveShares =
    splitType === "SHARES"
      ? Object.fromEntries(participantIds.map((id) => [id, shares[id] ?? "1"]))
      : shares;
  const preview = splitPreview(
    amount,
    splitType,
    participantIds,
    effectiveShares,
    group?.currency,
  );
  const scale = currencyScale(group?.currency);
  const formatShare = (value: number) =>
    `${group?.currency ?? ""} ${formatCurrencyAmount(value / scale, group?.currency)}`.trim();
  const unsaved = useUnsavedChanges(
    !!receipt || snapshot !== initialSnapshot,
    saving,
  );

  function returnToExpenses() {
    unsaved.requestLeave(() =>
      router.navigate({
        pathname: "/groups/[groupId]/expenses",
        params: { groupId },
      }),
    );
  }

  function leaveSavedForm() {
    router.navigate({
      pathname: "/groups/[groupId]/expenses",
      params: { groupId },
    });
  }

  async function handleSave() {
    if (submitting.current) return;

    setMessage("");
    setFieldErrors({});
    if (receipt && (!group || !receiptReviewed)) {
      setMessage(
        "Review the extracted details and confirm the amount is in your group currency before saving.",
      );
      return;
    }

    const normalizedAmount = amount.trim().replace(",", ".");
    const numericAmount = Number(normalizedAmount);

    if (!description.trim()) {
      fieldError("description", "Enter a description.");
      return;
    }

    if (!group) {
      setMessage("Wait for the group currency to load before saving.");
      return;
    }
    if (!validAmount(normalizedAmount, group.currency)) {
      fieldError(
        "amount",
        `Enter an amount greater than zero, with ${amountPrecisionLabel(group.currency)}.`,
      );
      return;
    }

    if (!members.some((member) => member._id === paidBy)) {
      fieldError("paidBy", "Choose who paid.");
      return;
    }

    if (
      mode === "STANDARD" &&
      (participantIds.length === 0 ||
        participantIds.some(
          (id) => !members.some((member) => member._id === id),
        ))
    ) {
      fieldError(
        "participants",
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
      fieldError("date", "Enter a valid date in YYYY-MM-DD format.");
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
    if (mode === "ITEMIZED") {
      const result = itemizedPreview(
        items,
        normalizedAmount,
        group.currency,
        members.map((member) => member._id),
      );
      if (result.error || !result.items) {
        fieldError("items", result.error || "Review the itemized split.");
        return;
      }
      body = { ...fields, splitType: "ITEMIZED", items: result.items };
    } else if (splitType === "EQUAL") {
      body = {
        ...fields,
        splitType,
        participants: participantIds.map((userId) => ({ userId })),
      };
    } else if (splitType === "SHARES") {
      const weights = participantIds.map((id) =>
        parseShareWeight(effectiveShares[id] ?? ""),
      );
      if (weights.some((weight) => weight === null)) {
        fieldError(
          "shares",
          `Enter a whole number of shares from 1 to ${MAX_SHARE_WEIGHT.toLocaleString()} for every selected member.`,
        );
        return;
      }
      body = {
        ...fields,
        splitType: "SHARES",
        participants: participantIds.map((userId, index) => ({
          userId,
          shares: weights[index]!,
        })),
      };
    } else {
      const values = participantIds.map((id) =>
        (shares[id] ?? "").trim().replace(",", "."),
      );
      if (
        values.some(
          (value) =>
            !validAmount(
              value,
              splitType === "PERCENTAGE" ? "PHP" : group.currency,
              true,
            ),
        )
      ) {
        fieldError(
          "shares",
          `Enter a nonnegative share for every selected member, with ${splitType === "PERCENTAGE" ? "up to 2 decimal places" : amountPrecisionLabel(group.currency)}.`,
        );
        return;
      }
      const total = values.reduce(
        (sum, value) =>
          sum +
          Math.round(
            Number(value) * (splitType === "PERCENTAGE" ? 100 : scale),
          ),
        0,
      );
      if (splitType === "EXACT") {
        if (total !== Math.round(numericAmount * scale)) {
          fieldError(
            "shares",
            "Member amounts must add up to the expense amount.",
          );
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
          fieldError(
            "shares",
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

    Keyboard.dismiss();
    submitting.current = true;

    try {
      if (expense) {
        await updateExpense({ groupId, expenseId: expense._id, body }).unwrap();
      } else {
        await createExpense({ groupId, body }).unwrap();
      }

      unsaved.complete(leaveSavedForm);
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
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        >
          <View className="gap-6">
            <View className="gap-2">
              <View className="flex-row items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  accessibilityLabel="Back to expenses"
                  disabled={saving}
                  onPress={returnToExpenses}
                >
                  <Ionicons
                    name="chevron-back"
                    size={22}
                    color={colors.foreground}
                    accessible={false}
                  />
                </Button>
                <Text className="flex-1 text-3xl font-semibold tracking-tight">
                  {expense
                    ? "Edit expense"
                    : receipt
                      ? "Review receipt"
                      : "Add expense"}
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground">
                {group?.name ?? "Your group"}
                {group ? ` · ${group.currency}` : ""}
              </Text>
            </View>

            {receipt ? (
              <View className="gap-3 rounded-[24px] border border-border bg-card p-5">
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    name="scan-outline"
                    size={20}
                    color={colors.primary}
                    accessible={false}
                  />
                  <Text className="font-semibold">Check before saving</Text>
                </View>
                {receiptImageUri ? (
                  <Image
                    source={{ uri: receiptImageUri }}
                    contentFit="contain"
                    style={{ width: "100%", height: 180, borderRadius: 12 }}
                    accessibilityLabel="Receipt photo for comparison"
                  />
                ) : null}
                <Text className="text-sm leading-5 text-muted-foreground">
                  Review the description, total, date, payer, and split below.
                  Missing details must be filled in.
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Receipt currency: {receipt.currency ?? "Not detected"} · Group
                  currency: {group?.currency ?? "Loading…"}
                </Text>
                {receipt.currency &&
                group &&
                receipt.currency !== group.currency ? (
                  <Text className="text-sm text-destructive">
                    The currencies differ. Enter the correct amount in{" "}
                    {group.currency}; no currency conversion is applied.
                  </Text>
                ) : null}
                {[
                  ["Subtotal", receipt.subtotal],
                  ["Tax", receipt.tax],
                  ["Tip", receipt.tip],
                ].map(([label, value]) =>
                  value != null ? (
                    <Text
                      key={String(label)}
                      className="text-xs text-muted-foreground"
                    >
                      {label}: {String(value)}
                    </Text>
                  ) : null,
                )}
                {receipt.items.length > 0 ? (
                  <View className="gap-2 border-t border-border pt-3">
                    <Text className="text-sm font-semibold">Scanned items</Text>
                    {receipt.items.slice(0, 30).map((item, index) => (
                      <View key={index} className="flex-row gap-3">
                        <Text className="flex-1 text-xs text-muted-foreground">
                          {item.quantity != null ? `${item.quantity} × ` : ""}
                          {item.description ?? "Unidentified item"}
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          {item.total != null
                            ? formatCurrencyAmount(
                                item.total,
                                receipt.currency ?? group?.currency,
                              )
                            : "—"}
                        </Text>
                      </View>
                    ))}
                    {receipt.items.length > 30 ? (
                      <Text className="text-xs text-muted-foreground">
                        Showing the first 30 items. Descriptions are included in
                        the editable notes below.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {receipt.warnings.map((warning, index) => (
                  <Text
                    key={index}
                    className="text-xs leading-5 text-muted-foreground"
                  >
                    {warning}
                  </Text>
                ))}
                <Button
                  variant={receiptReviewed ? "secondary" : "outline"}
                  disabled={saving || !group}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: receiptReviewed }}
                  onPress={() => setReceiptReviewed((value) => !value)}
                >
                  <Ionicons
                    name={
                      receiptReviewed ? "checkbox-outline" : "square-outline"
                    }
                    size={20}
                    color={colors.primary}
                    accessible={false}
                  />
                  <Text className="flex-1">
                    I checked these details and the amount is in{" "}
                    {group?.currency ?? "the group currency"}.
                  </Text>
                </Button>
              </View>
            ) : null}

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
                <View className="gap-3">
                  <Text className="font-semibold">Expense type</Text>
                  <View className="flex-row gap-3">
                    {(["STANDARD", "ITEMIZED"] as const).map((value) => (
                      <Button
                        key={value}
                        className="min-h-14 flex-1"
                        variant={mode === value ? "default" : "outline"}
                        disabled={saving}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: mode === value }}
                        onPress={() => {
                          setMode(value);
                          setMessage("");
                          setFieldErrors({});
                        }}
                      >
                        <Ionicons
                          name={
                            value === "STANDARD"
                              ? "receipt-outline"
                              : "list-outline"
                          }
                          size={20}
                          color={
                            mode === value
                              ? colors.primaryForeground
                              : colors.primary
                          }
                          accessible={false}
                        />
                        <Text>
                          {value === "STANDARD" ? "Standard" : "Itemized"}
                        </Text>
                      </Button>
                    ))}
                  </View>
                  <Text className="text-sm text-muted-foreground">
                    {mode === "STANDARD"
                      ? "Split one total equally, by exact amounts, or by percentage."
                      : "Assign each item to the people who share it. Switching modes keeps your draft entries until you save."}
                  </Text>
                  {expense?.splitType === "ITEMIZED" && mode === "STANDARD" ? (
                    <Text className="text-sm text-muted-foreground">
                      Saving as Standard removes the saved item breakdown and
                      uses the split below.
                    </Text>
                  ) : null}
                  {receipt?.items.length ? (
                    <Text className="text-sm text-muted-foreground">
                      {receipt.items.length} receipt items are ready in
                      Itemized. Check every description, quantity, line total
                      and assignment before saving.
                    </Text>
                  ) : null}
                </View>
                <View className="gap-5 rounded-[24px] bg-card p-5">
                  <FormField
                    label="Description"
                    icon="receipt-outline"
                    placeholder="e.g. Weekly groceries"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => amountInput.current?.focus()}
                    value={description}
                    error={fieldErrors.description}
                    onChangeText={(value) => {
                      setDescription(value);
                      setFieldErrors({});
                      setMessage("");
                    }}
                    editable={!saving}
                  />

                  <FormField
                    label={`Amount${group ? ` (${group.currency})` : ""}`}
                    icon="cash-outline"
                    placeholder={formatCurrencyAmount(0, group?.currency)}
                    keyboardType="decimal-pad"
                    inputRef={amountInput}
                    value={amount}
                    error={fieldErrors.amount}
                    onChangeText={(value) => {
                      setAmount(value);
                      setFieldErrors({});
                      setMessage("");
                    }}
                    editable={!saving}
                  />
                </View>

                <CategorySelector
                  value={category}
                  options={expenseCategoryOptions}
                  onChange={setCategory}
                  disabled={saving}
                />

                <ExpenseMemberSelector
                  mode="single"
                  value={paidBy}
                  members={members}
                  currentUserId={currentUserId}
                  disabled={saving}
                  error={fieldErrors.paidBy}
                  onChange={(id) => {
                    setPaidBy(id);
                    setFieldErrors({});
                    setMessage("");
                  }}
                />

                {mode === "ITEMIZED" ? (
                  <>
                    <FormMessage message={fieldErrors.items ?? ""} />
                    <ItemizedExpenseEditor
                      items={items}
                      onChange={(value) => {
                        setItems(value);
                        setFieldErrors({});
                        setMessage("");
                      }}
                      members={members}
                      amount={amount}
                      currency={group?.currency ?? "PHP"}
                      disabled={saving}
                    />
                  </>
                ) : (
                  <>
                    <View className="gap-3 rounded-[24px] bg-card p-5">
                      <ExpenseMemberSelector
                        mode="multiple"
                        value={participantIds}
                        members={members}
                        currentUserId={currentUserId}
                        disabled={saving}
                        error={fieldErrors.participants ?? fieldErrors.shares}
                        onChange={(ids) => {
                          setParticipantIds(ids);
                          setFieldErrors({});
                          setMessage("");
                        }}
                      />
                      <Text className="text-sm font-semibold">
                        How to split
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {(
                          ["EQUAL", "EXACT", "PERCENTAGE", "SHARES"] as const
                        ).map((value) => (
                          <Button
                            key={value}
                            variant={
                              splitType === value ? "default" : "outline"
                            }
                            className="min-h-12 h-auto grow rounded-2xl px-4 py-3"
                            disabled={saving}
                            accessibilityState={{
                              selected: splitType === value,
                            }}
                            onPress={() => {
                              if (value !== splitType)
                                setShares(
                                  value === "SHARES"
                                    ? Object.fromEntries(
                                        participantIds.map((id) => [id, "1"]),
                                      )
                                    : {},
                                );
                              setSplitType(value);
                              setMessage("");
                            }}
                          >
                            <Ionicons
                              name={
                                value === "EQUAL"
                                  ? "people-outline"
                                  : value === "EXACT"
                                    ? "cash-outline"
                                    : value === "SHARES"
                                      ? "layers-outline"
                                      : "pie-chart-outline"
                              }
                              size={20}
                              color={
                                splitType === value
                                  ? colors.primaryForeground
                                  : colors.primary
                              }
                              accessible={false}
                            />
                            <Text className="text-sm font-semibold">
                              {value === "EQUAL"
                                ? "Equally"
                                : value === "EXACT"
                                  ? "By amount"
                                  : value === "SHARES"
                                    ? "By shares"
                                    : "By percent"}
                            </Text>
                          </Button>
                        ))}
                      </View>
                      <Text className="text-sm text-muted-foreground">
                        {splitType === "EQUAL"
                          ? "Share the total equally between selected members. See each person’s amount below."
                          : splitType === "SHARES"
                            ? "Assign weights: 2 shares and 1 share split the cost in a 2:1 ratio. Each person starts with 1 share."
                            : splitType === "EXACT"
                              ? "Enter the amount each selected member owes. The amounts must match the total."
                              : "Enter each selected member’s percentage. Percentages must add up to 100%."}
                      </Text>
                    </View>

                    {splitType !== "EQUAL" ? (
                      <View className="gap-4 rounded-[24px] bg-card p-5">
                        <Text className="font-semibold">
                          {splitType === "SHARES"
                            ? "Member shares"
                            : splitType === "EXACT"
                              ? "Member amounts"
                              : "Member percentages"}
                        </Text>
                        <Text className="text-sm text-muted-foreground">
                          {splitType === "SHARES"
                            ? "Use positive whole numbers. More shares means a larger part of the total."
                            : splitType === "EXACT"
                              ? "Amounts must add up to the expense total."
                              : "Percentages must add up to 100%."}
                        </Text>
                        {participantIds.map((id) => {
                          const member = members.find(
                            (value) => value._id === id,
                          );
                          return (
                            <View key={id} className="flex-row items-end gap-2">
                              <View className="min-w-0 flex-1">
                                <FormField
                                  label={`${member?.firstName ?? "Member"} ${member?.lastName ?? ""}${splitType === "PERCENTAGE" ? " (%)" : splitType === "SHARES" ? " (shares)" : ""}`}
                                  icon={
                                    splitType === "SHARES"
                                      ? "layers-outline"
                                      : "cash-outline"
                                  }
                                  keyboardType={
                                    splitType === "SHARES"
                                      ? "number-pad"
                                      : "decimal-pad"
                                  }
                                  placeholder={
                                    splitType === "SHARES"
                                      ? "1"
                                      : formatCurrencyAmount(
                                          0,
                                          splitType === "PERCENTAGE"
                                            ? "PHP"
                                            : group?.currency,
                                        )
                                  }
                                  value={effectiveShares[id] ?? ""}
                                  editable={!saving}
                                  onChangeText={(value) => {
                                    setFieldErrors({});
                                    setMessage("");
                                    setShares((current) => ({
                                      ...current,
                                      [id]: value,
                                    }));
                                  }}
                                />
                              </View>
                              {splitType === "SHARES" ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={
                                      saving ||
                                      (parseShareWeight(effectiveShares[id]) ??
                                        1) <= 1
                                    }
                                    accessibilityLabel={`Decrease shares for ${member?.firstName ?? "member"}`}
                                    onPress={() => {
                                      setShares((current) => ({
                                        ...current,
                                        [id]: String(
                                          Math.max(
                                            1,
                                            (parseShareWeight(
                                              effectiveShares[id],
                                            ) ?? 1) - 1,
                                          ),
                                        ),
                                      }));
                                      setFieldErrors({});
                                      setMessage("");
                                    }}
                                  >
                                    <Ionicons
                                      name="remove"
                                      size={20}
                                      color={colors.primary}
                                      accessible={false}
                                    />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={
                                      saving ||
                                      (parseShareWeight(effectiveShares[id]) ??
                                        0) >= MAX_SHARE_WEIGHT
                                    }
                                    accessibilityLabel={`Increase shares for ${member?.firstName ?? "member"}`}
                                    onPress={() => {
                                      setShares((current) => ({
                                        ...current,
                                        [id]: String(
                                          (parseShareWeight(
                                            effectiveShares[id],
                                          ) ?? 0) + 1,
                                        ),
                                      }));
                                      setFieldErrors({});
                                      setMessage("");
                                    }}
                                  >
                                    <Ionicons
                                      name="add"
                                      size={20}
                                      color={colors.primary}
                                      accessible={false}
                                    />
                                  </Button>
                                </>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    ) : null}

                    <View className="gap-3 rounded-[24px] bg-card p-5">
                      <Text className="font-semibold">Split preview</Text>
                      {!preview || unavailableIds.length > 0 ? (
                        <Text className="text-sm text-muted-foreground">
                          {unavailableIds.length > 0
                            ? "Remove unavailable participants to preview this split."
                            : "Enter an amount and select participants to see their shares."}
                        </Text>
                      ) : (
                        <>
                          {participantIds.map((id, index) => {
                            const member = members.find(
                              (member) => member._id === id,
                            );
                            return (
                              <View
                                key={id}
                                className="flex-row items-center justify-between gap-3"
                              >
                                <Text className="flex-1">
                                  {member?.firstName} {member?.lastName}
                                  {id === currentUserId ? " (you)" : ""}
                                </Text>
                                <Text className="font-semibold">
                                  {preview.amounts[index] === null
                                    ? "—"
                                    : formatShare(preview.amounts[index])}
                                </Text>
                              </View>
                            );
                          })}
                          <Text
                            className="text-sm text-muted-foreground"
                            accessibilityLiveRegion="polite"
                          >
                            {splitType === "SHARES"
                              ? preview.complete
                                ? `${preview.totalShares} total shares. Rounding goes to the largest fractional remainders; ties follow member order.`
                                : "Enter a valid whole number of shares for every selected member."
                              : splitType === "EQUAL"
                                ? "Any rounding remainder goes to the first selected participant."
                                : preview.complete
                                  ? "All shares assigned."
                                  : preview.remaining === 0
                                    ? "Enter a valid share for every selected participant."
                                    : `${splitType === "PERCENTAGE" ? `${(Math.abs(preview.remaining) / 100).toFixed(2)}%` : formatShare(Math.abs(preview.remaining))} ${preview.remaining < 0 ? "over assigned" : "left to assign"}.`}
                          </Text>
                          {splitType === "PERCENTAGE" ? (
                            <Text className="text-xs text-muted-foreground">
                              Estimated amounts; rounding is reconciled to the
                              expense total once percentages reach 100%.
                            </Text>
                          ) : null}
                        </>
                      )}
                    </View>
                  </>
                )}

                <DateField
                  label="Expense date"
                  value={date}
                  error={fieldErrors.date}
                  onChange={(value) => {
                    setDate(value);
                    setFieldErrors({});
                    setMessage("");
                  }}
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
                  disabled={
                    saving ||
                    members.length === 0 ||
                    (!!receipt && (!group || !receiptReviewed))
                  }
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
      {unsaved.dialog}
    </SafeAreaView>
  );
}
