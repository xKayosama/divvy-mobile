import Ionicons from "@expo/vector-icons/Ionicons";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";

export function DeleteExpenseModal({
  visible, description, amount, recurring, deleting, refreshing, message, onClose, onConfirm,
}: {
  visible: boolean;
  description: string;
  amount: string;
  recurring: boolean;
  deleting: boolean;
  refreshing: boolean;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 justify-center bg-black/50 p-5">
          <Pressable className="absolute inset-0" accessibilityRole="button" accessibilityLabel="Cancel expense deletion" disabled={deleting} onPress={onClose} />
          <View className="w-full max-w-lg self-center rounded-[24px] border border-border bg-card p-6" style={{ maxHeight: "90%" }} accessibilityViewIsModal onAccessibilityEscape={onClose}>
            <ScrollView contentContainerStyle={{ gap: 16 }}>
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10">
                <Ionicons name="trash-outline" size={24} color={colors.destructive} accessible={false} />
              </View>
              <Text accessibilityRole="header" className="text-xl font-semibold">Delete expense?</Text>
              <View className="gap-1 rounded-2xl bg-secondary p-4">
                <Text className="font-semibold web:break-words">{description}</Text>
                <Text className="text-sm text-muted-foreground">{amount}</Text>
              </View>
              <Text className="text-sm text-muted-foreground">This cannot be undone. Deleting this expense will update group balances.</Text>
              {recurring ? <Text className="text-sm text-muted-foreground">Deleting the original also stops its recurring schedule. Existing occurrences remain.</Text> : null}
              {message ? <Text accessibilityLiveRegion="polite" className="text-sm text-destructive">{message}</Text> : null}
              <Button variant="destructive" disabled={deleting || refreshing} onPress={onConfirm} accessibilityState={{ busy: deleting }}>
                <Text>{deleting ? "Deleting…" : "Delete expense"}</Text>
              </Button>
              <Button variant="outline" disabled={deleting} onPress={onClose}><Text>Keep expense</Text></Button>
            </ScrollView>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
