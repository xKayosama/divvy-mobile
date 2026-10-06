import { Link } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useLoginMutation } from "@/features/auth/authApi";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { useSession } from "@/features/auth/SessionProvider";
import { authError } from "@/features/auth/errors";

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
      <View className="mb-8">
        <Text className="text-4xl font-bold text-primary">Divvy</Text>

        <Text className="mt-2 text-base text-muted-foreground">
          Sign in to manage and split your expenses.
        </Text>
      </View>

      <View className="gap-4">
        <View className="gap-2">
          <Text className="font-medium">Email</Text>

          <Input
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            accessibilityLabel="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setMessage("");
            }}
            editable={!busy}
          />
        </View>

        <View className="gap-2">
          <Text className="font-medium">Password</Text>

          <Input
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            accessibilityLabel="Password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setMessage("");
            }}
            editable={!busy}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
        </View>

        {message ? (
          <Text accessibilityLiveRegion="polite">{message}</Text>
        ) : null}

        <Button className="mt-2" onPress={handleLogin} disabled={busy}>
          <Text>{busy ? "Signing in…" : "Sign in"}</Text>
        </Button>
      </View>

      <View className="mt-6 flex-row justify-center gap-1">
        <Text className="text-muted-foreground">
          Don&apos;t have an account?
        </Text>

        <Link href="/register" asChild>
          <Text className="font-semibold text-primary">Sign up</Text>
        </Link>
      </View>
    </AuthScreen>
  );
}
