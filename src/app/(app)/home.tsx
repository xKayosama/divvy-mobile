import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppSelector } from "@/hooks/redux";
import { useLogoutMutation } from "@/features/auth/authApi";
import { useSession } from "@/features/auth/SessionProvider";
import { authError, errorStatus } from "@/features/auth/errors";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Brand } from "@/components/brand/Brand";
import { FormMessage } from "@/components/auth/FormField";

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
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingVertical: 24,
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 560, alignSelf: "center" }}>
          <View className="mb-9 flex-row items-center justify-between">
            <Brand />
            <View
              accessibilityLabel={`${user?.firstName} ${user?.lastName}`}
              className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card"
            >
              <Text className="text-sm font-bold text-primary">
                {user?.firstName[0]}
                {user?.lastName[0]}
              </Text>
            </View>
          </View>
          <Text className="mb-2 text-sm font-medium text-muted-foreground">
            YOUR SHARED SPACE
          </Text>
          <Text
            accessibilityRole="header"
            className="text-3xl font-bold tracking-tight"
          >
            Hey, {user?.firstName}.
          </Text>
          <Text className="mt-2 text-base leading-6 text-muted-foreground">
            A little less math. A little more life.
          </Text>
          <View className="mt-7 overflow-hidden rounded-[28px] bg-primary p-6">
            <View className="mb-6 h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Ionicons
                name="people-outline"
                size={26}
                color="white"
                accessible={false}
              />
            </View>
            <Text className="text-2xl font-bold leading-8 text-white">
              Good things are{`\n`}better shared.
            </Text>
            <Text className="mt-3 text-base leading-6 text-white/90">
              One place for the expenses you share with the people in your life.
            </Text>
          </View>
          <View className="mt-7 rounded-[28px] border border-border bg-card p-5">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-lg font-semibold">Your groups</Text>
              <View className="rounded-full bg-secondary px-3 py-1">
                <Text className="text-xs font-semibold text-primary">
                  Coming soon
                </Text>
              </View>
            </View>
            <View className="items-center px-2 py-7">
              <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
                <Ionicons
                  name="albums-outline"
                  size={30}
                  color="#1769F5"
                  accessible={false}
                />
              </View>
              <Text className="text-center text-lg font-semibold">
                Make room for your people.
              </Text>
              <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">
                A shared home, a weekend away, or dinner with friends. Your
                groups will live here.
              </Text>
            </View>
          </View>
          <View className="mt-7 flex-row items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <Ionicons
              name="person-circle-outline"
              size={30}
              color="#1769F5"
              accessible={false}
            />
            <View className="flex-1">
              <Text className="font-semibold">
                {user?.firstName} {user?.lastName}
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                {user?.email}
              </Text>
            </View>
          </View>
          <View className="mt-4 gap-3">
            <FormMessage message={message} />
            <Button
              variant="ghost"
              className="h-12 sm:h-12"
              onPress={signOut}
              disabled={busy}
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color="#64748B"
                accessible={false}
              />
              <Text className="font-semibold text-muted-foreground">
                {busy ? "Signing out…" : "Sign out"}
              </Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
