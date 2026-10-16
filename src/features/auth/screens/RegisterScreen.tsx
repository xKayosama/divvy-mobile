import { useTheme } from "@/theme/ThemeProvider";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import { Keyboard, View } from "react-native";
import { AuthScreen, AuthHeading } from "@/components/auth/AuthScreen";
import { FormField, FormMessage } from "@/components/auth/FormField";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useRegisterMutation } from "@/features/auth/authApi";
import { authError } from "@/features/auth/errors";

export default function RegisterScreen() {
  const { colors } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState(false);
  const [register, { isLoading }] = useRegisterMutation();
  const submitting = useRef(false);
  async function handleRegister() {
    if (submitting.current || created) return;
    setMessage("");
    setFieldErrors({});
    const field = !firstName.trim() ? "firstName" : !lastName.trim() ? "lastName" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? "email" : !password ? "password" : password !== confirmation ? "confirmation" : undefined;
    if (field) {
      const errors = { firstName: "Enter your first name.", lastName: "Enter your last name.", email: "Enter a valid email address.", password: "Enter a password.", confirmation: "Your passwords do not match." };
      setFieldErrors({ [field]: errors[field] });
      return;
    }
    Keyboard.dismiss();
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
            color={colors.primary}
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
              color={colors.primaryForeground}
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
          error={fieldErrors.firstName}
          value={firstName}
          onChangeText={value => { setFirstName(value); setFieldErrors({}); setMessage(""); }}
          editable={!isLoading}
        />
        <FormField
          label="Last name"
          icon="person-outline"
          placeholder="Last name"
          autoComplete="family-name"
          autoCapitalize="words"
          error={fieldErrors.lastName}
          value={lastName}
          onChangeText={value => { setLastName(value); setFieldErrors({}); setMessage(""); }}
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
          error={fieldErrors.email}
          value={email}
          onChangeText={value => { setEmail(value); setFieldErrors({}); setMessage(""); }}
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
          error={fieldErrors.password}
          value={password}
          onChangeText={value => { setPassword(value); setFieldErrors({}); setMessage(""); }}
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
          error={fieldErrors.confirmation}
          value={confirmation}
          onChangeText={value => { setConfirmation(value); setFieldErrors({}); setMessage(""); }}
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
