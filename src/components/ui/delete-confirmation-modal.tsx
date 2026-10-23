import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button } from "./button";
import { Text } from "./text";
import { useTheme } from "@/theme/ThemeProvider";

export function DeleteConfirmationModal({
  visible,
  title,
  name,
  detail,
  children,
  message,
  busy,
  disabled,
  confirmLabel,
  cancelLabel,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  name: string;
  detail?: string;
  children: ReactNode;
  message: string;
  busy: boolean;
  disabled: boolean;
  confirmLabel: string;
  cancelLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 justify-center bg-black/50 p-5">
          <Pressable
            className="absolute inset-0"
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            disabled={busy}
            onPress={onClose}
          />
          <View
            className="w-full max-w-lg self-center rounded-[24px] border border-border bg-card p-6"
            style={{ maxHeight: "90%" }}
            accessibilityViewIsModal
            onAccessibilityEscape={onClose}
          >
            <ScrollView contentContainerStyle={{ gap: 16 }}>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
                <Ionicons
                  name="trash-outline"
                  size={24}
                  color={colors.destructive}
                  accessible={false}
                />
              </View>
              <Text
                accessibilityRole="header"
                className="text-xl font-semibold"
              >
                {title}
              </Text>
              <View className="gap-1 rounded-2xl bg-secondary p-4">
                <Text className="font-semibold web:break-words">{name}</Text>
                {detail ? (
                  <Text className="text-sm text-muted-foreground">
                    {detail}
                  </Text>
                ) : null}
              </View>
              {children}
              {message ? (
                <Text
                  accessibilityLiveRegion="polite"
                  className="text-sm text-destructive"
                >
                  {message}
                </Text>
              ) : null}
              <Button
                  variant="destructive"
                disabled={busy || disabled}
                onPress={onConfirm}
                accessibilityState={{ busy }}
              >
                <Text>{busy ? "Deleting…" : confirmLabel}</Text>
              </Button>
              <Button variant="outline" disabled={busy} onPress={onClose}>
                <Text>{cancelLabel}</Text>
              </Button>
            </ScrollView>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
