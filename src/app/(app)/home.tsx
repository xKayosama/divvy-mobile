import { useRef, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppSelector } from "@/hooks/redux";
import { useLogoutMutation } from "@/features/auth/authApi";
import { useSession } from "@/features/auth/SessionProvider";
import { authError, errorStatus } from "@/features/auth/errors";
export default function Home() {
  const user = useAppSelector((s) => s.auth.user);
  const { clear } = useSession();
  const [logout] = useLogoutMutation();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  async function signOut() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      try {
        await logout().unwrap();
      } catch (error) {
        if (errorStatus(error) !== 401) throw error;
      }
      await clear();
    } catch (error) {
      setMessage(authError(error, "Could not sign out. Please try again."));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 gap-6 px-6 py-8">
        <Text className="text-3xl font-bold">Welcome, {user?.firstName}</Text>
        <Text className="text-muted-foreground">
          You’re signed in to Divvy.
        </Text>
        <View className="rounded-xl border border-border p-5 gap-2">
          <Text className="text-xl font-semibold">Your shared expenses</Text>
          <Text>
            Groups, expenses, and balances will appear here as we build your
            dashboard.
          </Text>
        </View>
        {message ? (
          <Text accessibilityLiveRegion="polite">{message}</Text>
        ) : null}
        <Button variant="outline" onPress={signOut} disabled={busy}>
          <Text>{busy ? "Signing out…" : "Sign out"}</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
