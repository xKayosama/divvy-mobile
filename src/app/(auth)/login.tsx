import { Link } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useLoginMutation } from "@/features/auth/authApi";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [login, { isLoading }] = useLoginMutation();
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
      await login({ email: trimmedEmail, password }).unwrap();
      setPassword("");
      setMessage("Sign-in request succeeded.");
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error
        ? error.status : undefined;
      setMessage(status === 401 || status === 403
        ? "The email or password was not accepted. Please try again."
        : status === "FETCH_ERROR" || status === "TIMEOUT_ERROR"
          ? "Could not reach the server. Check your connection and try again."
          : "Sign in failed. Please try again.");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <View className="mb-8">
        <Text className="text-4xl font-bold text-primary">
          Divvy
        </Text>

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
            onChangeText={(value) => { setEmail(value); setMessage(""); }}
            editable={!isLoading}
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
            onChangeText={(value) => { setPassword(value); setMessage(""); }}
            editable={!isLoading}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
        </View>

        {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}

        <Button className="mt-2" onPress={handleLogin} disabled={isLoading}>
          <Text>{isLoading ? "Signing in…" : "Sign in"}</Text>
        </Button>
      </View>

      <View className="mt-6 flex-row justify-center gap-1">
        <Text className="text-muted-foreground">
          Don&apos;t have an account?
        </Text>

        <Link href="/register" asChild>
          <Text className="font-semibold text-primary">
            Sign up
          </Text>
        </Link>
      </View>
    </View>
  );
}
