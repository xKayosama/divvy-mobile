import "../global.css";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { store } from "@/store";
import { useAppSelector } from "@/hooks/redux";
import { SessionProvider, useSession } from "@/features/auth/SessionProvider";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
function Navigator() {
  const { loading, restoreError, retry } = useSession();
  const user = useAppSelector((s) => s.auth.user);
  if (loading || restoreError)
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        {loading ? (
          <ActivityIndicator accessibilityLabel="Restoring session" />
        ) : (
          <>
            <Text accessibilityLiveRegion="polite">{restoreError}</Text>
            <Button onPress={retry}>
              <Text>Try again</Text>
            </Button>
          </>
        )}
      </View>
    );
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <SessionProvider>
          <StatusBar style="auto" />
          <Navigator />
          <PortalHost />
        </SessionProvider>
      </SafeAreaProvider>
    </Provider>
  );
}
