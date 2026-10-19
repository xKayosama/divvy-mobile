import { useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useEffect, useRef, useState } from "react";
import { Modal, Platform, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export function useUnsavedChanges(dirty: boolean, saving = false) {
  const navigation = useNavigation();
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [allowed, setAllowed] = useState(false);
  const executed = useRef<(() => void) | null>(null);
  const guarded = !allowed && (dirty || saving);
  usePreventRemove(guarded, ({ data }) => {
    if (!saving) setPending(() => () => navigation.dispatch(data.action));
  });
  useEffect(() => {
    if (allowed && pending && executed.current !== pending) {
      executed.current = pending;
      pending();
    }
  }, [allowed, pending]);
  useEffect(() => {
    if (Platform.OS !== "web" || !guarded || typeof window === "undefined") return;
    const listener = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [guarded]);
  function requestLeave(action: () => void) {
    if (saving) return;
    if (dirty && !allowed) setPending(() => action);
    else action();
  }
  function complete(action: () => void) {
    setPending(() => action);
    setAllowed(true);
  }
  const dialog = (
    <Modal visible={!!pending && !allowed} transparent animationType="fade" onRequestClose={() => setPending(null)}>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 justify-center bg-black/40 p-6">
          <View className="gap-4 rounded-[24px] border border-border bg-card p-6" accessibilityViewIsModal>
            <Text accessibilityRole="header" className="text-xl font-semibold">Discard unsaved changes?</Text>
            <Text className="text-sm leading-5 text-muted-foreground">Your changes haven’t been saved. Leaving now will discard them.</Text>
            <Button onPress={() => setPending(null)}><Text>Keep editing</Text></Button>
            <Button variant="destructive" onPress={() => setAllowed(true)}><Text>Discard changes</Text></Button>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
  return { requestLeave, complete, dialog };
}
