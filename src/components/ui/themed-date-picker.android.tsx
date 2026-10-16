import { DatePickerDialog, Host } from "@expo/ui/jetpack-compose";
import { useTheme } from "@/theme/ThemeProvider";

type Props = { value: Date; onSelect: (date: Date) => void; onDismiss: () => void };

export default function ThemedDatePicker({ value, onSelect, onDismiss }: Props) {
  const { colors, mode } = useTheme();
  // Material date pickers represent calendar days in UTC.
  const utcDay = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
  return (
    <Host colorScheme={mode} seedColor={colors.primary}>
      <DatePickerDialog
        initialDate={utcDay.toISOString()}
        color={colors.primary}
        onDismissRequest={onDismiss}
        onDateSelected={(date) => onSelect(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12))}
      />
    </Host>
  );
}
