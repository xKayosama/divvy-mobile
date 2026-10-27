import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormField, FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useUpdateProfileMutation, useRequestEmailChangeMutation, useConfirmEmailChangeMutation } from "@/features/auth/authApi";
import { useSession } from "@/features/auth/SessionProvider";
import { authError } from "@/features/auth/errors";
import { useAppSelector } from "@/hooks/redux";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useTheme } from "@/theme/ThemeProvider";
import { validateEmailChange, validateNames } from "../profileValidation";

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.auth.user);
  const { signIn, clear } = useSession();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [update] = useUpdateProfileMutation();
  const [requestEmail] = useRequestEmailChangeMutation();
  const [confirmEmail] = useConfirmEmailChangeMutation();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const dirty = firstName !== user?.firstName || lastName !== user?.lastName || !!email || !!password || !!pendingEmail;
  const leave = useUnsavedChanges(dirty, busy);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function perform(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage(""); setNotice(""); Keyboard.dismiss();
    try { await action(); }
    catch (error) { setMessage(authError(error, "Could not update your account. Please try again.")); }
    finally { lock.current = false; setBusy(false); }
  }
  async function saveNames() {
    const error = validateNames(firstName, lastName);
    if (error) { setMessage(error); return; }
    await perform(async () => {
      const result = await update({ firstName: firstName.trim(), lastName: lastName.trim() }).unwrap();
      setFirstName(result.data.user.firstName); setLastName(result.data.user.lastName);
      setNotice("Your profile has been updated.");
    });
  }
  async function sendCode() {
    const target = (pendingEmail || email).trim().toLowerCase();
    const error = validateEmailChange(target, password);
    if (error) { setMessage(error); return; }
    if (cooldown > 0) return;
    await perform(async () => {
      await requestEmail({ email: target, password }).unwrap();
      setPendingEmail(target); setCode(""); setCooldown(60);
      setNotice("Verification code sent to your new email. It expires in 15 minutes.");
    });
  }
  async function verify() {
    if (!/^\d{8}$/.test(code)) { setMessage("Enter the 8-digit verification code."); return; }
    await perform(async () => {
      const result = await confirmEmail({ email: pendingEmail, code }).unwrap();
      setPassword(""); setEmail(""); setCode(""); setPendingEmail("");
      try { await signIn(result); }
      catch {
        // The old token is revoked; never retain it after a confirmed email change.
        try { await clear(); } catch { /* Cleared in memory even if secure storage is unavailable. */ }
        return;
      }
      setNotice("Email updated. Other sessions have been signed out.");
    });
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View className="flex-row items-center gap-3">
          <Button variant="outline" size="icon" accessibilityLabel="Back to profile" disabled={busy} onPress={() => leave.requestLeave(() => { if (router.canGoBack()) router.back(); else router.replace("/profile"); })}>
            <Ionicons name="chevron-back" size={22} color={colors.foreground} accessible={false} />
          </Button>
          <Text accessibilityRole="header" className="flex-1 text-2xl font-semibold">Edit profile</Text>
        </View>
        <FormMessage message={message} />
        {notice ? <Text accessibilityLiveRegion="polite" className="text-sm text-primary">{notice}</Text> : null}
        <View className="gap-4 rounded-3xl bg-card p-5">
          <Text className="text-lg font-semibold">Your details</Text>
          <FormField label="First name" icon="person-outline" value={firstName} onChangeText={setFirstName} maxLength={100} editable={!busy} autoCapitalize="words" autoComplete="given-name" />
          <FormField label="Last name" icon="person-outline" value={lastName} onChangeText={setLastName} maxLength={100} editable={!busy} autoCapitalize="words" autoComplete="family-name" />
          <Button disabled={busy || (firstName === user?.firstName && lastName === user?.lastName)} onPress={() => void saveNames()}><Text>{busy ? "Please wait…" : "Save details"}</Text></Button>
        </View>
        <View className="gap-4 rounded-3xl bg-card p-5">
          <Text className="text-lg font-semibold">Change email</Text>
          <Text className="text-sm leading-5 text-muted-foreground">Current email: {user?.email}. Your new address must be verified before it changes. Other sessions will be signed out.</Text>
          {pendingEmail ? <Text className="text-sm">Enter the code sent to {pendingEmail}.</Text> : <FormField label="New email address" icon="mail-outline" value={email} onChangeText={setEmail} maxLength={254} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />}
          <FormField label="Current password" icon="lock-closed-outline" password value={password} onChangeText={setPassword} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" />
          {pendingEmail ? <>
            <FormField label="Verification code" icon="key-outline" value={code} onChangeText={value => setCode(value.replace(/\D/g, ""))} keyboardType="number-pad" maxLength={8} editable={!busy} autoComplete="one-time-code" />
            <Button disabled={busy} onPress={() => void verify()}><Text>{busy ? "Please wait…" : "Verify and change email"}</Text></Button>
            <Button variant="outline" disabled={busy || cooldown > 0} onPress={() => void sendCode()}><Text>{cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}</Text></Button>
            <Button variant="ghost" disabled={busy} onPress={() => { setPendingEmail(""); setCode(""); setMessage(""); setNotice(""); }}><Text>Use a different email</Text></Button>
          </> : <Button variant="outline" disabled={busy || cooldown > 0} onPress={() => void sendCode()}><Text>{cooldown > 0 ? `Request code in ${cooldown}s` : "Send verification code"}</Text></Button>}
        </View>
      </ScrollView>
      {leave.dialog}
    </SafeAreaView>
  );
}
