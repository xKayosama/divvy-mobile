import "../global.css";

import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Provider } from "react-redux";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import {
  SessionProvider,
  useSession,
} from "@/features/auth/SessionProvider";
import { useAppSelector } from "@/hooks/redux";
import { store } from "@/store";

function Navigator() {
  const { loading, restoreError, retry } = useSession();
  const user = useAppSelector((state) => state.auth.user);

  if (loading || restoreError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        {loading ? (
          <ActivityIndicator accessibilityLabel="Restoring session" />
        ) : (
          <>
            <Text accessibilityLiveRegion="polite">
              {restoreError}
            </Text>

            <Button onPress={retry}>
              <Text>Try again</Text>
            </Button>
          </>
        )}
      </View>
    );
  }

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

function ThemedStatusBar() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar style="light" />

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: colors.primary,
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <SessionProvider>
          <View style={{ flex: 1 }}>
            <Navigator />
            <ThemedStatusBar />
            <PortalHost />
          </View>
        </SessionProvider>
      </SafeAreaProvider>
    </Provider>
  );
}