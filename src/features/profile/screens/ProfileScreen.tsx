import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { useLogoutMutation } from "@/features/auth/authApi";
import { authError, errorStatus } from "@/features/auth/errors";
import { useSession } from "@/features/auth/SessionProvider";
import { useAppSelector } from "@/hooks/redux";

export default function ProfileScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const { clear } = useSession();
  const [logout] = useLogoutMutation();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
      >
        <View className="gap-6">
          <View className="flex-row items-center gap-3">
            <Button
              variant="outline"
              className="h-12 w-12 rounded-full p-0"
              accessibilityLabel="Go back"
              disabled={busy}
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace("/groups");
              }}
            >
              <Ionicons
                name="arrow-back"
                size={21}
                color={colors.foreground}
                accessible={false}
              />
            </Button>

            <Text className="text-2xl font-semibold">Profile</Text>
          </View>

          <View className="items-center gap-3 rounded-[28px] bg-card px-5 py-8">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-secondary">
              <Text className="text-2xl font-semibold text-primary">
                {user?.firstName.charAt(0)}
                {user?.lastName.charAt(0)}
              </Text>
            </View>

            <Text className="text-center text-xl font-semibold">
              {user?.firstName} {user?.lastName}
            </Text>

            <Text className="text-center text-sm text-muted-foreground">
              {user?.email}
            </Text>
          </View>

          <View className="gap-5 rounded-[24px] bg-card p-5">
            <Text className="text-lg font-semibold">
              Account details
            </Text>

            <View className="gap-1">
              <Text className="text-xs text-muted-foreground">
                First name
              </Text>
              <Text className="font-medium">{user?.firstName}</Text>
            </View>

            <View className="gap-1 border-t border-border pt-4">
              <Text className="text-xs text-muted-foreground">
                Last name
              </Text>
              <Text className="font-medium">{user?.lastName}</Text>
            </View>

            <View className="gap-1 border-t border-border pt-4">
              <Text className="text-xs text-muted-foreground">
                Email address
              </Text>
              <Text className="font-medium">{user?.email}</Text>
            </View>
          </View>

          <FormMessage message={message} />

          <Button
            variant="outline"
            className="h-14 rounded-2xl border-destructive/20"
            disabled={busy}
            onPress={signOut}
          >
            <Ionicons
              name="log-out-outline"
              size={20}
              color={colors.destructive}
              accessible={false}
            />
            <Text className="font-semibold text-destructive">
              {busy ? "Signing out…" : "Sign out"}
            </Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}