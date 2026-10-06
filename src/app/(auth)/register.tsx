import { Link } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";
import { AuthScreen, AuthHeading } from "@/components/auth/AuthScreen";
import { FormField, FormMessage } from "@/components/auth/FormField";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button } from "@/components/ui/button";
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
        <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
          <Ionicons
            name="checkmark"
            size={32}
            color="#1769F5"
            accessible={false}
          />
        </View>
        <AuthHeading
          title="You’re all set."
          subtitle="Your account is ready. Sign in to start sharing expenses."
        />
        <Link href="/login" replace asChild>
          <Button className="h-14 rounded-2xl sm:h-14">
            <Text className="text-base font-semibold">Let’s sign in</Text>
            <Ionicons
              name="arrow-forward"
              size={19}
              color="white"
              accessible={false}
            />
          </Button>
        </Link>
      </AuthScreen>
    );
  return (
    <AuthScreen>
      <AuthHeading
        title="Better together."
        subtitle="Create your account. Make shared spending simpler."
      />
      <View className="gap-4 rounded-[28px] border border-border bg-card p-5">
        <FormField
          label="First name"
          icon="person-outline"
          placeholder="First name"
          autoComplete="given-name"
          autoCapitalize="words"
          value={firstName}
          onChangeText={setFirstName}
          editable={!isLoading}
        />
        <FormField
          label="Last name"
          icon="person-outline"
          placeholder="Last name"
          autoComplete="family-name"
          autoCapitalize="words"
          value={lastName}
          onChangeText={setLastName}
          editable={!isLoading}
        />
        <FormField
          label="Email address"
          icon="mail-outline"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
        />
        <FormField
          label="Password"
          icon="lock-closed-outline"
          password
          placeholder="Create a password"
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />
        <FormField
          label="Confirm password"
          icon="lock-closed-outline"
          password
          placeholder="Enter your password again"
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          value={confirmation}
          onChangeText={setConfirmation}
          editable={!isLoading}
          returnKeyType="go"
          onSubmitEditing={handleRegister}
        />
        <FormMessage message={message} />
        <Button
          className="mt-2 h-14 rounded-2xl sm:h-14"
          disabled={isLoading}
          onPress={handleRegister}
        >
          <Text className="text-base font-semibold">
            {isLoading ? "Creating account…" : "Create account"}
          </Text>
        </Button>
      </View>
      <View className="mt-5 flex-row flex-wrap items-center justify-center">
        <Text className="text-sm text-muted-foreground">
          Already have an account?
        </Text>
        <Link href="/login" replace asChild>
          <Button
            variant="ghost"
            disabled={isLoading}
            className="min-h-12 px-2"
          >
            <Text className="text-sm font-semibold text-primary">Sign in</Text>
          </Button>
        </Link>
      </View>
    </AuthScreen>
  );
}
