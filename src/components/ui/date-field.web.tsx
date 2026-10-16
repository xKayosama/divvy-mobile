import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";

type Props = { label: string; value: string; onChange: (value: string) => void; disabled?: boolean };

export default function DateField({ label, value, onChange, disabled }: Props) {
  const { colors, mode } = useTheme();
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">{label}</Text>
      <input
        type="date"
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        style={{ minHeight: 56, boxSizing: "border-box", width: "100%", borderRadius: 16, border: `1px solid ${colors.border}`, padding: "0 16px", backgroundColor: colors.background, color: colors.foreground, font: "inherit", colorScheme: mode }}
      />
    </View>
  );
}
