import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Keyboard, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import { groupIcons, resolveGroupIcon, type GroupIcon } from "../groupIcons";

const iconRows = Array.from({ length: Math.ceil(groupIcons.length / 3) }, (_, index) =>
  groupIcons.slice(index * 3, index * 3 + 3),
);

export function GroupIconSelector({ value, onChange, disabled = false }: {
  value: GroupIcon;
  onChange: (icon: GroupIcon) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const current = resolveGroupIcon(value);
  const preview = resolveGroupIcon(draft);

  function close() {
    setOpen(false);
  }

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">Group icon</Text>
      <Button
        variant="outline"
        className="h-auto min-h-20 justify-start gap-4 rounded-2xl"
        disabled={disabled}
        accessibilityLabel={`Group icon: ${current.label}. Change icon`}
        accessibilityState={{ expanded: open, disabled }}
        onPress={() => {
          Keyboard.dismiss();
          setDraft(value);
          setOpen(true);
        }}
      >
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-secondary">
          <Ionicons name={current.glyph} size={28} color={colors.primary} accessible={false} />
        </View>
        <Text className="min-w-0 flex-1 text-base">{current.label}</Text>
        <Text className="text-sm" style={{ color: colors.primary }}>Change</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} accessible={false} />
      </Button>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <SafeAreaProvider>
          <SafeAreaView className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
            <Pressable className="absolute inset-0" accessibilityRole="button" accessibilityLabel="Cancel icon selection" onPress={close} />
            <View
              className="w-full self-center rounded-t-[28px] border border-border bg-background"
              style={{ maxHeight: "90%", maxWidth: 520 }}
              accessibilityViewIsModal
              onAccessibilityEscape={close}
            >
              <View className="flex-row items-center justify-between gap-3 px-5 pb-2 pt-5">
                <Text accessibilityRole="header" className="min-w-0 flex-1 text-xl font-semibold">Choose a group icon</Text>
                <Button variant="ghost" size="icon" accessibilityLabel="Cancel icon selection" onPress={close}>
                  <Ionicons name="close" size={24} color={colors.foreground} accessible={false} />
                </Button>
              </View>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 20 }}>
                <Text className="text-sm text-muted-foreground">Give your group a familiar face so it’s easy to find.</Text>
                <View className="items-center gap-3 rounded-[24px] bg-secondary px-4 py-5">
                  <View className="h-20 w-20 items-center justify-center rounded-[24px] bg-background">
                    <Ionicons name={preview.glyph} size={44} color={colors.primary} accessible={false} />
                  </View>
                  <Text className="text-base font-semibold" accessibilityLiveRegion="polite">{preview.label}</Text>
                </View>
                <View className="gap-3">
                  {iconRows.map((row, index) => (
                    <View key={index} className="flex-row gap-3">
                      {row.map(icon => {
                        const selected = draft === icon.value;
                        return (
                          <Button
                            key={icon.value}
                            variant="outline"
                            className={`min-h-24 min-w-0 flex-1 flex-col gap-2 rounded-2xl border-2 px-2 py-4 ${selected ? "bg-secondary" : ""}`}
                            style={{ borderColor: selected ? colors.primary : colors.border }}
                            accessibilityRole="radio"
                            accessibilityLabel={`${icon.label} group icon`}
                            accessibilityState={{ checked: selected }}
                            onPress={() => setDraft(icon.value)}
                          >
                            {selected ? (
                              <View className="absolute right-1 top-1">
                                <Ionicons name="checkmark-circle" size={17} color={colors.primary} accessible={false} />
                              </View>
                            ) : null}
                            <Ionicons name={icon.glyph} size={28} color={colors.primary} accessible={false} />
                            <Text className="text-center text-sm">{icon.label}</Text>
                          </Button>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </ScrollView>
              <View className="gap-2 border-t border-border px-5 pb-4 pt-3">
                <Button className="min-h-14" onPress={() => { onChange(draft); close(); }}>
                  <Ionicons name="checkmark" size={20} color={colors.primaryForeground} accessible={false} />
                  <Text>Use {preview.label.toLowerCase()} icon</Text>
                </Button>
                <Button variant="ghost" onPress={close}><Text>Cancel</Text></Button>
              </View>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
