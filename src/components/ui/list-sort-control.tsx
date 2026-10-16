import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button } from "./button";
import { Text } from "./text";
import { useTheme } from "@/theme/ThemeProvider";

export function ListSortControl<T extends string>({ title, value, defaultValue, options, onChange }: {
  title: string;
  value: T;
  defaultValue: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const label = options.find(option => option.value === value)?.label;
  const active = value !== defaultValue;
  return (
    <>
      <Button variant={active ? "default" : "outline"} className="h-11 w-11 rounded-2xl p-0" accessibilityLabel={`Sort ${title.toLowerCase()}, ${label}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(true)}>
        <Ionicons name="swap-vertical-outline" size={21} color={active ? colors.primaryForeground : colors.foreground} accessible={false} />
      </Button>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider>
          <SafeAreaView className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
            <Pressable className="absolute inset-0" accessibilityLabel="Close sort options" accessibilityRole="button" onPress={() => setOpen(false)} />
            <View className="mx-4 rounded-[24px] border border-border bg-card p-5" accessibilityViewIsModal>
              <ScrollView contentContainerStyle={{ gap: 12 }}>
                <Text accessibilityRole="header" className="mb-1 text-xl font-semibold">Sort {title.toLowerCase()}</Text>
                {options.map(option => (
                  <Button key={option.value} variant={value === option.value ? "default" : "outline"} className="h-auto min-h-12 justify-between py-3" accessibilityState={{ selected: value === option.value }} onPress={() => { onChange(option.value); setOpen(false); }}>
                    <Text className="flex-1">{option.label}</Text>
                    {value === option.value ? <Ionicons name="checkmark" size={20} color={colors.primaryForeground} accessible={false} /> : null}
                  </Button>
                ))}
                <Button variant="ghost" onPress={() => setOpen(false)}><Text>Cancel</Text></Button>
              </ScrollView>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}
