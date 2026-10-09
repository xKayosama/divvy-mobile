import { Link } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useLoginMutation } from "@/features/auth/authApi";

import { AuthHeading, AuthScreen } from "@/components/auth/AuthScreen";
import { FormField, FormMessage } from "@/components/auth/FormField";
import { useSession } from "@/features/auth/SessionProvider";
import { authError } from "@/features/auth/errors";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const [saving, setSaving] = useState(false);
  const busy = isLoading || saving;
  const submitting = useRef(false);

  async function handleLogin() {
    if (submitting.current) return;
    setMessage("");
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || !password) {
      setMessage("Enter a valid email address and your password.");
      return;
    }
    if (!process.env.EXPO_PUBLIC_API_URL?.trim()) {
      setMessage("The API URL is missing. Configure it and restart the app.");
      return;
    }
    submitting.current = true;
    try {
      const response = await login({ email: trimmedEmail, password }).unwrap();
      setSaving(true);
      await signIn(response);
      setPassword("");
    } catch (error) {
      setMessage(
        authError(error, "Could not complete sign in. Please try again."),
      );
    } finally {
      setSaving(false);
      submitting.current = false;
    }
  }

  return (
    <AuthScreen>
      <AuthHeading
        title="Welcome back."
        subtitle="Sign in and pick up where you left off."
      />
      <View className="gap-5 rounded-[28px] border border-border bg-card p-5">
        <FormField
          label="Email address"
          icon="mail-outline"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setMessage("");
          }}
          editable={!busy}
        />
        <FormField
          label="Password"
          icon="lock-closed-outline"
          password
          placeholder="Enter your password"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setMessage("");
          }}
          editable={!busy}
          returnKeyType="go"
          onSubmitEditing={handleLogin}
        />
        <FormMessage message={message} />
        <Button
          className="mt-1 h-14 rounded-2xl sm:h-14"
          onPress={handleLogin}
          disabled={busy}
        >
          <Text className="text-base font-semibold">
            {busy ? "Signing in…" : "Sign in"}
          </Text>
          {!busy ? (
            <Ionicons
              name="arrow-forward"
              size={19}
              color="white"
              accessible={false}
            />
          ) : null}
        </Button>
      </View>
      <View className="mt-5 flex-row flex-wrap items-center justify-center">
        <Text className="text-sm text-muted-foreground">New to Divvy?</Text>
        <Link href="/register" asChild>
          <Button variant="ghost" disabled={busy} className="min-h-12 px-2">
            <Text className="text-sm font-semibold text-primary">
              Create an account
            </Text>
          </Button>
        </Link>
      </View>
    </AuthScreen>
  );
}
