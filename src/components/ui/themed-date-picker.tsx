import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useTheme } from "@/theme/ThemeProvider";

type Props = { value: Date; onSelect: (date: Date) => void; onDismiss: () => void };

export default function ThemedDatePicker({ value, onSelect, onDismiss }: Props) {
  const { colors, mode } = useTheme();
  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="inline"
      themeVariant={mode}
      accentColor={colors.primary}
      onDismiss={onDismiss}
      onValueChange={(_event, date) => onSelect(date)}
    />
  );
}
