import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Keyboard, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import ThemedDatePicker from "@/components/ui/themed-date-picker";
import { useTheme } from "@/theme/ThemeProvider";
import { scheduleDate, validateRecurrenceEnd } from "../recurrence";

export function RecurrenceEndDateSelector({
  value,
  onChange,
  firstDate,
  disabled = false,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  firstDate?: string;
  disabled?: boolean;
  error?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const earliest = firstDate?.slice(0, 10) ?? "";
  const draftError = draft
    ? validateRecurrenceEnd(draft, earliest)
    : "Choose an end date.";
  function chooseDate() {
    Keyboard.dismiss();
    const today = new Date().toISOString().slice(0, 10);
    setDraft(value || (earliest > today ? earliest : today));
    setPickerOpen(true);
    setOpen(true);
  }
  const parsed = new Date(`${draft}T12:00:00`);
  return (
    <View className="gap-3">
      <Text className="text-sm font-semibold">Ends</Text>
      <View className="flex-row flex-wrap gap-2">
        <Button
          variant={!value ? "default" : "outline"}
          disabled={disabled}
          accessibilityRole="radio"
          accessibilityState={{ checked: !value }}
          onPress={() => onChange("")}
        >
          <Ionicons
            name="infinite-outline"
            size={20}
            color={!value ? colors.primaryForeground : colors.primary}
            accessible={false}
          />
          <Text>No end date</Text>
        </Button>
        <Button
          variant={value ? "default" : "outline"}
          disabled={disabled}
          accessibilityRole="radio"
          accessibilityState={{ checked: !!value, expanded: open }}
          onPress={chooseDate}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={value ? colors.primaryForeground : colors.primary}
            accessible={false}
          />
          <Text>On a date</Text>
        </Button>
      </View>
      {value ? (
        <Button
          variant="outline"
          className="h-auto min-h-14 justify-start"
          disabled={disabled}
          accessibilityLabel={`End date: ${scheduleDate(value)}. Change date`}
          onPress={chooseDate}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={colors.primary}
            accessible={false}
          />
          <Text className="min-w-0 flex-1 shrink">{scheduleDate(value)}</Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.mutedForeground}
            accessible={false}
          />
        </Button>
      ) : null}
      <Text className="text-sm text-muted-foreground">
        {value
          ? `Repeats through ${scheduleDate(value)}, including that day.`
          : "Keeps repeating until you pause it or set an end date."}
      </Text>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm text-destructive"
        >
          {error}
        </Text>
      ) : null}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaProvider>
          <SafeAreaView
            className="flex-1 justify-end"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          >
            <Pressable
              className="absolute inset-0"
              accessibilityRole="button"
              accessibilityLabel="Cancel end date selection"
              onPress={() => setOpen(false)}
            />
            <View
              accessibilityViewIsModal
              onAccessibilityEscape={() => setOpen(false)}
              className="w-full self-center rounded-t-[28px] border border-border bg-background"
              style={{ maxWidth: 520, maxHeight: "90%" }}
            >
              <View className="flex-row items-center gap-3 px-5 pt-4">
                <Text
                  accessibilityRole="header"
                  className="flex-1 text-xl font-semibold"
                >
                  Choose end date
                </Text>
                <Button
                  variant="ghost"
                  size="icon"
                  accessibilityLabel="Cancel end date selection"
                  onPress={() => setOpen(false)}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.foreground}
                    accessible={false}
                  />
                </Button>
              </View>
              <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
                <Text className="text-sm text-muted-foreground">
                  Expenses can repeat through this date.{" "}
                  {earliest ? `Choose ${scheduleDate(earliest)} or later.` : ""}
                </Text>
                {open && pickerOpen ? (
                  <ThemedDatePicker
                    value={
                      Number.isFinite(parsed.getTime()) ? parsed : new Date()
                    }
                    onDismiss={() => setPickerOpen(false)}
                    onSelect={(date) => {
                      setDraft(
                        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
                      );
                      setPickerOpen(false);
                    }}
                  />
                ) : (
                  <Button variant="outline" onPress={() => setPickerOpen(true)}>
                    <Text>Change date</Text>
                  </Button>
                )}
                <Text className="font-semibold">
                  {draft ? scheduleDate(draft) : "Choose a date"}
                </Text>
                {draftError ? (
                  <Text
                    className="text-sm text-destructive"
                    accessibilityLiveRegion="polite"
                  >
                    {draftError}
                  </Text>
                ) : null}
              </ScrollView>
              <View className="gap-2 border-t border-border p-5">
                <Button
                  disabled={disabled || !!draftError}
                  onPress={() => {
                    onChange(draft);
                    setOpen(false);
                  }}
                >
                  <Text>Use this date</Text>
                </Button>
                <Button variant="ghost" onPress={() => setOpen(false)}>
                  <Text>Cancel</Text>
                </Button>
              </View>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
