import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ComponentProps } from "react";
import { Keyboard, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button } from "./button";
import { Text } from "./text";
import { useTheme } from "@/theme/ThemeProvider";

type CategoryOption<T extends string> = {
  value: T;
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
};

export function CategorySelector<T extends string>({ value, options, onChange, onClear, disabled = false, inline = false, compact = true }: {
  value?: T;
  options: readonly CategoryOption<T>[];
  onChange: (value: T) => void;
  onClear?: () => void;
  disabled?: boolean;
  inline?: boolean;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value);
  const label = selected?.label ?? (value ? "Choose category" : "All categories");
  const choices = [
    ...(onClear ? [{ key: "all", label: "All categories", icon: "grid-outline" as const, selected: value === undefined, choose: onClear }] : []),
    ...options.map(option => ({ key: option.value, label: option.label, icon: option.icon, selected: value === option.value, choose: () => onChange(option.value) })),
  ];
  const columns = compact ? 3 : 2;
  const rows = Array.from({ length: Math.ceil(choices.length / columns) }, (_, index) => choices.slice(index * columns, index * columns + columns));
  const grid = (
    <View className={compact ? "gap-2" : "gap-3"}>
      {rows.map((row, index) => (
        <View key={index} className={`flex-row ${compact ? "gap-2" : "gap-3"}`}>
          {row.map(choice => (
            <Button
              key={choice.key}
              variant="outline"
              className={`min-w-0 flex-1 flex-col rounded-2xl border-2 ${compact ? "min-h-16 gap-1 px-2 py-2" : "min-h-24 gap-2 px-3 py-4"} ${choice.selected ? "bg-secondary" : ""}`}
              style={{ borderColor: choice.selected ? colors.primary : colors.border }}
              accessibilityRole="radio"
              accessibilityLabel={choice.label}
              accessibilityState={{ checked: choice.selected, disabled }}
              disabled={disabled}
              onPress={() => { choice.choose(); setOpen(false); }}
            >
              {choice.selected ? (
                <View className={compact ? "absolute right-1 top-1" : "absolute right-2 top-2"}><Ionicons name="checkmark-circle" size={compact ? 14 : 18} color={colors.primary} accessible={false} /></View>
              ) : null}
              <Ionicons name={choice.icon} size={compact ? 20 : 28} color={colors.primary} accessible={false} />
              <Text className={`w-full shrink text-center ${compact ? "text-xs" : "text-sm"}`}>{choice.label}</Text>
            </Button>
          ))}
          {Array.from({ length: columns - row.length }, (_, index) => <View key={`empty-${index}`} className="flex-1" />)}
        </View>
      ))}
    </View>
  );

  if (inline) return <View className="gap-3"><Text className="font-semibold">Category</Text>{grid}</View>;

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">Category</Text>
      <Button
        variant="outline"
        className="h-auto min-h-20 justify-start gap-3 rounded-2xl"
        disabled={disabled}
        accessibilityLabel={`Category: ${label}. Change category`}
        accessibilityState={{ expanded: open, disabled }}
        onPress={() => { Keyboard.dismiss(); setOpen(true); }}
      >
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
          <Ionicons name={selected?.icon ?? "grid-outline"} size={27} color={colors.primary} accessible={false} />
        </View>
        <Text className="min-w-0 flex-1 shrink text-base">{label}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} accessible={false} />
      </Button>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider>
          <SafeAreaView className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
            <Pressable className="absolute inset-0" accessibilityRole="button" accessibilityLabel="Cancel category selection" onPress={() => setOpen(false)} />
            <View className="w-full self-center rounded-t-[28px] border border-border bg-background" style={{ maxHeight: "90%", maxWidth: 520 }} accessibilityViewIsModal onAccessibilityEscape={() => setOpen(false)}>
              <View className="flex-row items-center justify-between gap-3 px-5 pb-2 pt-4">
                <Text accessibilityRole="header" className="min-w-0 flex-1 text-xl font-semibold">Choose a category</Text>
                <Button variant="ghost" size="icon" accessibilityLabel="Cancel category selection" onPress={() => setOpen(false)}><Ionicons name="close" size={24} color={colors.foreground} accessible={false} /></Button>
              </View>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 16 }}>
                <Text className="text-sm text-muted-foreground">Tap the category that best fits this spending.</Text>
                {grid}
              </ScrollView>
              <View className="border-t border-border px-5 py-3"><Button variant="ghost" onPress={() => setOpen(false)}><Text>Cancel</Text></Button></View>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
