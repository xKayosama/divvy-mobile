import { Link } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useRegisterMutation } from "@/features/auth/authApi";
import { authError } from "@/features/auth/errors";

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState(false);
  const [register, { isLoading }] = useRegisterMutation();
  const submitting = useRef(false);
  async function handleRegister() {
    if (submitting.current || created) return;
    setMessage("");
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      !password
    ) {
      setMessage(
        "Enter your first name, last name, a valid email address, and password.",
      );
      return;
    }
    if (password !== confirmation) {
      setMessage("Your passwords do not match.");
      return;
    }
    submitting.current = true;
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      }).unwrap();
      setPassword("");
      setConfirmation("");
      setCreated(true);
    } catch (error) {
      setMessage(
        authError(error, "Could not create your account. Please try again."),
      );
    } finally {
      submitting.current = false;
    }
  }
  if (created)
    return (
      <AuthScreen>
        <Text className="text-3xl font-bold">Account created</Text>
        <Text className="mt-3 mb-6" accessibilityLiveRegion="polite">
          Your account is ready. Sign in to start using Divvy.
        </Text>
        <Link href="/login" replace asChild>
          <Button>
            <Text>Sign in</Text>
          </Button>
        </Link>
      </AuthScreen>
    );
  return (
    <AuthScreen>
      <Text className="text-3xl font-bold mb-2">Create account</Text>
      <Text className="text-muted-foreground mb-6">
        Start sharing expenses with Divvy.
      </Text>
      <View className="gap-4">
        <View className="gap-2">
          <Text>First name</Text>
          <Input
            accessibilityLabel="First name"
            autoComplete="given-name"
            autoCapitalize="words"
            value={firstName}
            onChangeText={setFirstName}
            editable={!isLoading}
          />
        </View>
        <View className="gap-2">
          <Text>Last name</Text>
          <Input
            accessibilityLabel="Last name"
            autoComplete="family-name"
            autoCapitalize="words"
            value={lastName}
            onChangeText={setLastName}
            editable={!isLoading}
          />
        </View>
        <View className="gap-2">
          <Text>Email</Text>
          <Input
            accessibilityLabel="Email"
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            editable={!isLoading}
          />
        </View>
        <View className="gap-2">
          <Text>Password</Text>
          <Input
            accessibilityLabel="Password"
            secureTextEntry
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
            editable={!isLoading}
          />
        </View>
        <View className="gap-2">
          <Text>Confirm password</Text>
          <Input
            accessibilityLabel="Confirm password"
            secureTextEntry
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect={false}
            value={confirmation}
            onChangeText={setConfirmation}
            editable={!isLoading}
            returnKeyType="go"
            onSubmitEditing={handleRegister}
          />
        </View>
        {message ? (
          <Text accessibilityLiveRegion="polite">{message}</Text>
        ) : null}
        <Button disabled={isLoading} onPress={handleRegister}>
          <Text>{isLoading ? "Creating account…" : "Create account"}</Text>
        </Button>
        <Link href="/login" replace asChild>
          <Button variant="ghost" disabled={isLoading}>
            <Text>Back to sign in</Text>
          </Button>
        </Link>
      </View>
    </AuthScreen>
  );
}
