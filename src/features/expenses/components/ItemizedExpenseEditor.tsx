import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import {
  currencyScale,
  formatCurrencyAmount,
  validAmount,
} from "@/features/groups/money";
import {
  emptyItem,
  itemizedPreview,
  MAX_EXPENSE_ITEMS,
  type ItemDraft,
} from "../itemized";
import type { ExpenseUser } from "../types";

export function ItemizedExpenseEditor({
  items,
  onChange,
  members,
  amount,
  currency,
  disabled,
}: {
  items: ItemDraft[];
  onChange: (items: ItemDraft[]) => void;
  members: ExpenseUser[];
  amount: string;
  currency: string;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(
    items[0]?.id ?? null,
  );
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const editing = items.find((item) => item.id === assigning);
  const activeIds = members.map((member) => member._id);
  const preview = itemizedPreview(
    items,
    amount.trim().replace(",", "."),
    currency,
    activeIds,
  );
  const scale = currencyScale(currency);
  const validTotals = items.every((item) =>
    validAmount(item.amount.trim().replace(",", "."), currency, true),
  );
  const totalUnits = items.reduce(
    (sum, item) =>
      validAmount(item.amount.trim().replace(",", "."), currency, true)
        ? sum +
          BigInt(Math.round(Number(item.amount.replace(",", ".")) * scale))
        : sum,
    0n,
  );
  const totalSafe = totalUnits <= BigInt(Number.MAX_SAFE_INTEGER);
  const format = (value: number) =>
    `${currency} ${formatCurrencyAmount(value, currency)}`;
  function update(id: string, patch: Partial<ItemDraft>) {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }
  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-lg font-semibold">
          Items & assignments
        </Text>
        <Text className="text-sm text-muted-foreground">
          Enter each item’s total price for the quantity shown.
          Shared items split equally among their assigned members.
        </Text>
        <Text className="text-sm text-muted-foreground">
          Add tax or tip as separate items and choose who shares them. The line
          totals must match the expense total.
        </Text>
      </View>
      {items.map((item, index) => {
        const expanded = expandedId === item.id;
        const names = item.memberIds.map((id) => {
          const member = members.find((member) => member._id === id);
          return member
            ? `${member.firstName} ${member.lastName}`
            : "Unavailable member";
        });
        return (
          <View
            key={item.id}
            className="gap-4 rounded-[24px] border border-border bg-card p-4"
          >
            <View className="flex-row items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="h-auto min-w-0 flex-1 justify-start px-0"
                disabled={disabled}
                accessibilityLabel={`Edit item ${index + 1}, ${item.description || "unnamed item"}`}
                accessibilityState={{ expanded }}
                onPress={() => setExpandedId(expanded ? null : item.id)}
              >
                <Ionicons
                  name="receipt-outline"
                  size={20}
                  color={colors.primary}
                  accessible={false}
                />
                <Text className="min-w-0 flex-1 shrink font-semibold">
                  {index + 1}. {item.description || "New item"}
                </Text>
                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.mutedForeground}
                  accessible={false}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={disabled}
                accessibilityLabel={`Remove item ${index + 1}${item.description ? `, ${item.description}` : ""}`}
                onPress={() =>
                  onChange(items.filter((value) => value.id !== item.id))
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={colors.destructive}
                  accessible={false}
                />
              </Button>
            </View>
            {expanded ? (
              <>
                <FormField
                  label="Item description"
                  icon="receipt-outline"
                  value={item.description}
                  maxLength={200}
                  placeholder="e.g. Shared pizza"
                  editable={!disabled}
                  onChangeText={(description) =>
                    update(item.id, { description })
                  }
                />
                <FormField
                  label="Quantity"
                  icon="layers-outline"
                  value={item.quantity}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 1"
                  editable={!disabled}
                  onChangeText={(quantity) => update(item.id, { quantity })}
                />
                <FormField
                  label={`Line total (${currency})`}
                  icon="cash-outline"
                  value={item.amount}
                  keyboardType="decimal-pad"
                  placeholder={formatCurrencyAmount(0, currency)}
                  editable={!disabled}
                  onChangeText={(amount) => update(item.id, { amount })}
                />
              </>
            ) : (
              <Text className="text-sm text-muted-foreground">
                Quantity: {item.quantity || "Check quantity"} ·{" "}
                {validAmount(
                  item.amount.trim().replace(",", "."),
                  currency,
                  true,
                )
                  ? format(Number(item.amount.replace(",", ".")))
                  : "Add line total"}
              </Text>
            )}
            <Button
              variant="outline"
              className="h-auto min-h-14 justify-start"
              disabled={disabled}
              accessibilityLabel={`Assign item ${index + 1}. ${names.length ? names.join(", ") : "No members assigned"}`}
              onPress={() => {
                setSelectedIds([...item.memberIds]);
                setAssigning(item.id);
              }}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.primary}
                accessible={false}
              />
              <Text className="min-w-0 flex-1 shrink">
                {names.length ? names.join(", ") : "Assign members"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.mutedForeground}
                accessible={false}
              />
            </Button>
          </View>
        );
      })}
      <Button
        variant="outline"
        disabled={disabled || items.length >= MAX_EXPENSE_ITEMS}
        onPress={() => {
          const item = emptyItem();
          onChange([...items, item]);
          setExpandedId(item.id);
        }}
      >
        <Ionicons
          name="add-circle-outline"
          size={22}
          color={colors.primary}
          accessible={false}
        />
        <Text>Add item</Text>
      </Button>
      <View className="gap-3 rounded-[24px] bg-secondary p-5">
        <Text className="font-semibold">Review itemized split</Text>
        <Text>
          Items total:{" "}
          {validTotals && totalSafe
            ? format(Number(totalUnits) / scale)
            : "Check line totals"}
        </Text>
        <Text>
          Expense total:{" "}
          {validAmount(amount.trim().replace(",", "."), currency)
            ? format(Number(amount.replace(",", ".")))
            : "Enter an amount"}
        </Text>
        {preview.error ? (
          <Text
            accessibilityLiveRegion="polite"
            className="text-sm text-muted-foreground"
          >
            {preview.error}
          </Text>
        ) : (
          <>
            {preview.participants?.map((part) => {
              const member = members.find(
                (member) => member._id === part.userId,
              );
              return (
                <View
                  key={part.userId}
                  className="flex-row justify-between gap-3"
                >
                  <Text className="min-w-0 flex-1">
                    {member?.firstName} {member?.lastName}
                  </Text>
                  <Text className="font-semibold">{format(part.amount)}</Text>
                </View>
              );
            })}
            <Text className="text-sm text-muted-foreground">
              All items assigned. Shares match the expense total. Each line’s
              rounding remainder goes to its first assigned member.
            </Text>
          </>
        )}
      </View>
      <Modal
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setAssigning(null)}
      >
        <SafeAreaProvider>
          <SafeAreaView className="flex-1 bg-background">
            <View className="gap-2 px-5 pt-4">
              <Text
                accessibilityRole="header"
                className="text-xl font-semibold"
              >
                Who shares this item?
              </Text>
              <Text className="text-sm text-muted-foreground">
                {editing?.description || "Unnamed item"} · Select one person or
                share with several.
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Button
                  variant="outline"
                  onPress={() => setSelectedIds(activeIds)}
                >
                  <Text>Select everyone</Text>
                </Button>
                <Button variant="ghost" onPress={() => setSelectedIds([])}>
                  <Text>Clear selection</Text>
                </Button>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
              {members.map((member) => {
                const checked = selectedIds.includes(member._id);
                return (
                  <Button
                    key={member._id}
                    variant={checked ? "secondary" : "outline"}
                    className="h-auto min-h-14 justify-start"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    onPress={() =>
                      setSelectedIds((ids) =>
                        ids.includes(member._id)
                          ? ids.filter((id) => id !== member._id)
                          : [...ids, member._id],
                      )
                    }
                  >
                    <Ionicons
                      name={checked ? "checkbox" : "square-outline"}
                      size={23}
                      color={colors.primary}
                      accessible={false}
                    />
                    <Text className="min-w-0 flex-1 shrink">
                      {member.firstName} {member.lastName}
                    </Text>
                  </Button>
                );
              })}
              {selectedIds.some((id) => !activeIds.includes(id)) ? (
                <Button
                  variant="outline"
                  onPress={() =>
                    setSelectedIds((ids) =>
                      ids.filter((id) => activeIds.includes(id)),
                    )
                  }
                >
                  <Text>Remove unavailable members</Text>
                </Button>
              ) : null}
            </ScrollView>
            <View className="gap-2 border-t border-border p-5">
              <Button
                disabled={
                  disabled ||
                  !selectedIds.length ||
                  selectedIds.some((id) => !activeIds.includes(id))
                }
                onPress={() => {
                  if (editing)
                    update(editing.id, { memberIds: [...selectedIds] });
                  setAssigning(null);
                }}
              >
                <Text>Use selected members ({selectedIds.length})</Text>
              </Button>
              <Button variant="ghost" onPress={() => setAssigning(null)}>
                <Text>Cancel</Text>
              </Button>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
