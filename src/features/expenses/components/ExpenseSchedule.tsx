import { useState } from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import DateField from "@/components/ui/date-field";
import { FormMessage } from "@/components/auth/FormField";
import { authError } from "@/features/auth/errors";
import { useTheme } from "@/theme/ThemeProvider";
import { useUpdateExpenseRecurrenceMutation } from "../expensesApi";
import {
  frequencyLabels,
  scheduleDate,
  validateRecurrenceEnd,
} from "../recurrence";
import type { Expense, ExpenseFrequency } from "../types";

export function ExpenseRepeatFields({
  repeat,
  frequency,
  endDate,
  onRepeat,
  onFrequency,
  onEndDate,
  disabled,
  error,
}: {
  repeat: boolean;
  frequency: ExpenseFrequency;
  endDate: string;
  onRepeat: (value: boolean) => void;
  onFrequency: (value: ExpenseFrequency) => void;
  onEndDate: (value: string) => void;
  disabled: boolean;
  error?: string;
}) {
  const { colors } = useTheme();
  return (
    <View className="gap-4 rounded-[24px] border border-border bg-card p-5">
      <Button
        variant="outline"
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: repeat }}
        onPress={() => onRepeat(!repeat)}
      >
        <Ionicons
          name={repeat ? "checkbox" : "square-outline"}
          size={22}
          color={colors.primary}
          accessible={false}
        />
        <Text>Repeat this expense</Text>
      </Button>
      {repeat ? (
        <>
          <Text className="text-sm text-muted-foreground">
            Record this expense now and repeat it on future dates using the same
            payer and split settings. Dates follow UTC.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {(Object.keys(frequencyLabels) as ExpenseFrequency[]).map(
              (value) => (
                <Button
                  key={value}
                  variant={frequency === value ? "default" : "outline"}
                  disabled={disabled}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: frequency === value }}
                  onPress={() => onFrequency(value)}
                >
                  <Text>{frequencyLabels[value]}</Text>
                </Button>
              ),
            )}
          </View>
          <DateField
            label="End date (optional, inclusive)"
            value={endDate}
            onChange={onEndDate}
            disabled={disabled}
            error={error}
          />
          {endDate ? (
            <Button
              variant="ghost"
              disabled={disabled}
              onPress={() => onEndDate("")}
            >
              <Text>No end date</Text>
            </Button>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
export function ExpenseSchedule({
  expense,
  disabled = false,
}: {
  expense: Expense;
  disabled?: boolean;
}) {
  const [update, { isLoading }] = useUpdateExpenseRecurrenceMutation();
  const [end, setEnd] = useState(
    expense.recurring?.endDate?.slice(0, 10) ?? "",
  );
  const [message, setMessage] = useState("");
  const busy = disabled || isLoading;
  const schedule = expense.recurring;
  async function save(body: { paused?: boolean; endDate?: string | null }) {
    if (busy) return;
    const error =
      body.endDate !== undefined
        ? validateRecurrenceEnd(end, schedule?.anchor ?? expense.date)
        : "";
    if (error) {
      setMessage(error);
      return;
    }
    setMessage("");
    try {
      await update({
        groupId: expense.groupId,
        expenseId: expense._id,
        body,
      }).unwrap();
    } catch (error) {
      setMessage(
        authError(
          error,
          "Could not update this schedule. Refresh and try again.",
        ),
      );
    }
  }
  if (!schedule)
    return expense.recurrenceSourceId ? (
      <View className="gap-2 rounded-[24px] bg-card p-5">
        <Text className="font-semibold">Recurring occurrence</Text>
        <Text className="text-sm text-muted-foreground">
          Editing this entry changes only this occurrence.
        </Text>
        <Button
          variant="outline"
          disabled={busy}
          onPress={() =>
            router.push({
              pathname: "/groups/[groupId]/expenses/[expenseId]",
              params: {
                groupId: expense.groupId,
                expenseId: expense.recurrenceSourceId!,
              },
            })
          }
        >
          <Text>View original & schedule</Text>
        </Button>
      </View>
    ) : null;
  return (
    <View className="gap-4 rounded-[24px] bg-card p-5">
      <Text accessibilityRole="header" className="text-lg font-semibold">
        {frequencyLabels[schedule.frequency]} expense ·{" "}
        {schedule.paused
          ? "Paused"
          : schedule.nextDate
            ? "Active"
            : "Completed"}
      </Text>
      <Text>
        {schedule.nextDate
          ? `${schedule.paused ? "Scheduled date" : "Next expense"}: ${scheduleDate(schedule.nextDate)}`
          : "No remaining occurrences within the end date."}
      </Text>
      <Text className="text-sm text-muted-foreground">
        Future entries reuse this expense’s payer, amount, category and split.
        Editing this original updates future entries; existing occurrences stay
        unchanged. The first date anchors the schedule.
      </Text>
      {schedule.lastError ? <FormMessage message={schedule.lastError} /> : null}
      <Button
        variant="outline"
        disabled={busy || (!schedule.paused && !schedule.nextDate)}
        onPress={() => void save({ paused: !schedule.paused })}
      >
        <Text>
          {isLoading
            ? "Updating…"
            : schedule.paused
              ? "Resume schedule"
              : "Pause schedule"}
        </Text>
      </Button>
      <Text className="text-sm text-muted-foreground">
        Resume skips missed dates and continues on the next future date. An
        occurrence already processing may finish before pause takes effect.
      </Text>
      <DateField
        label="End date (optional, inclusive)"
        value={end}
        onChange={(value) => {
          setEnd(value);
          setMessage("");
        }}
        disabled={busy}
      />
      {end ? (
        <Button variant="ghost" disabled={busy} onPress={() => setEnd("")}>
          <Text>No end date</Text>
        </Button>
      ) : null}
      <Button
        variant="outline"
        disabled={busy || end === (schedule.endDate?.slice(0, 10) ?? "")}
        onPress={() => void save({ endDate: end || null })}
      >
        <Text>Save end date</Text>
      </Button>
      <FormMessage message={message} />
    </View>
  );
}
