import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { tabContentBottomInset } from "@/constants/navigation";
import { FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useTheme } from "@/theme/ThemeProvider";
import { useLogoutMutation } from "@/features/auth/authApi";
import { authError, errorStatus } from "@/features/auth/errors";
import { useSession } from "@/features/auth/SessionProvider";
import { useAppSelector } from "@/hooks/redux";

export default function ProfileScreen({ inTabs = false }: { inTabs?: boolean }) {
  const insets = useSafeAreaInsets();
  const { colors, preference, setPreference, saveError } = useTheme();
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
    <SafeAreaView edges={inTabs ? ["top", "left", "right"] : ["top", "bottom", "left", "right"]} className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, flexGrow: 1, paddingBottom: inTabs ? tabContentBottomInset(insets.bottom) : 20 }}
      >
        <View className="gap-6">
          <View className="flex-row items-center gap-3">
            {!inTabs ? <Button
              variant="outline"
              size="icon"
              accessibilityLabel="Go back"
              disabled={busy}
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace("/groups");
              }}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.foreground}
                accessible={false}
              />
            </Button> : null}

            <Text className="text-2xl font-semibold">Profile</Text>
          </View>

          <View className="items-center gap-3 rounded-[28px] bg-card px-5 py-8">
            <UserAvatar firstName={user?.firstName} lastName={user?.lastName} size={80} />

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

          <View className="gap-4 rounded-[24px] bg-card p-5">
            <Text className="text-lg font-semibold">Appearance</Text>
            <View className="flex-row gap-2">
              {(["light", "dark", "system"] as const).map((option) => (
                <Button
                  key={option}
                  variant={preference === option ? "default" : "outline"}
                  className="flex-1 rounded-xl"
                  accessibilityState={{ selected: preference === option }}
                  onPress={() => setPreference(option)}
                >
                  <Text>{option.charAt(0).toUpperCase() + option.slice(1)}</Text>
                </Button>
              ))}
            </View>
            <Text className="text-xs text-muted-foreground">System follows your device appearance.</Text>
            <FormMessage message={saveError ?? ""} />
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
