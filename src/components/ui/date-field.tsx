import Ionicons from "@expo/vector-icons/Ionicons";
import ThemedDatePicker from "@/components/ui/themed-date-picker";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";

type Props = { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; error?: string };

export default function DateField({ label, value, onChange, disabled, error }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(`${value}T12:00:00`) : new Date();
  const valid = Number.isFinite(parsed.getTime());
  const date = valid ? parsed : new Date();

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || "Select date"}`}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(!open)}
        className="min-h-14 flex-row items-center gap-3 rounded-2xl border border-input bg-background px-4"
      >
        <Ionicons name="calendar-outline" size={19} color={colors.mutedForeground} accessible={false} />
        <Text className={value ? "text-foreground" : "text-muted-foreground"}>
          {value && !valid ? value : value ? date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Select date"}
        </Text>
      </Pressable>
      {error ? <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">{error}</Text> : null}
      {open && !disabled ? (
        <ThemedDatePicker
          value={date}
          onDismiss={() => setOpen(false)}
          onSelect={(selectedDate) => {
            onChange(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`);
            setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}
