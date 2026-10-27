import { Link } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, View } from "react-native";

import { AuthHeading, AuthScreen } from "@/components/auth/AuthScreen";
import { FormField, FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useRequestPasswordResetMutation, useResetPasswordMutation } from "../authApi";
import { authError } from "../errors";
import { passwordResetErrors, resetEmailError } from "../passwordResetForm";

export default function PasswordResetScreen() {
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [requestCode, requestState] = useRequestPasswordResetMutation();
  const [resetPassword, resetState] = useResetPasswordMutation();
  const lock = useRef(false);
  const mounted = useRef(true);
  const busy = requestState.isLoading || resetState.isLoading;
  const remaining = Math.max(0, Math.ceil((resendAt - now) / 1000));

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!resendAt) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= resendAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendAt]);

  function clearFeedback() { setErrors({}); setMessage(""); }
  async function sendCode() {
    if (lock.current || Date.now() < resendAt) return;
    clearFeedback();
    const error = resetEmailError(email);
    if (error) { setErrors({ email: error }); return; }
    Keyboard.dismiss();
    lock.current = true;
    setNotice("");
    try {
      await requestCode({ email: email.trim().toLowerCase() }).unwrap();
      if (!mounted.current) return;
      setEmail(email.trim().toLowerCase());
      setCode("");
      setStep("reset");
      setNotice("If an account exists for this email, a code will arrive shortly. Check your inbox and spam folder. Codes expire after 15 minutes; only the newest code works.");
      const time = Date.now();
      setNow(time);
      setResendAt(time + 60000);
    } catch (error) {
      if (mounted.current) setMessage(authError(error, "Could not request a code. Please try again."));
    } finally { lock.current = false; }
  }
  async function submit() {
    if (lock.current) return;
    clearFeedback();
    const fieldErrors = passwordResetErrors(email, code, password, confirmation);
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    Keyboard.dismiss();
    lock.current = true;
    try {
      await resetPassword({ email, code: code.trim(), password }).unwrap();
      if (!mounted.current) return;
      setCode(""); setPassword(""); setConfirmation(""); setNotice("");
      setStep("success");
    } catch (error) {
      if (mounted.current) setMessage(authError(error, "Could not reset your password. Please try again."));
    } finally { lock.current = false; }
  }

  return (
    <AuthScreen>
      <AuthHeading
        title={step === "success" ? "Password updated." : step === "email" ? "Forgot your password?" : "Choose a new password."}
        subtitle={step === "success" ? "Sign in with your new password. Your previous sessions have been signed out." : step === "email" ? "Enter your account email and we’ll send you a reset code." : `Enter the code sent to ${email} and your new password.`}
      />
      {step !== "success" ? (
        <View className="gap-5 rounded-[28px] border border-border bg-card p-5">
          {step === "email" ? (
            <FormField label="Email address" icon="mail-outline" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" value={email} error={errors.email} editable={!busy} onChangeText={(value) => { setEmail(value); clearFeedback(); }} onSubmitEditing={sendCode} returnKeyType="go" />
          ) : (
            <>
              {notice ? <Text accessibilityLiveRegion="polite" className="text-sm leading-5 text-muted-foreground">{notice}</Text> : null}
              <FormField label="Reset code" icon="key-outline" placeholder="8-digit code" keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={8} value={code} error={errors.code} editable={!busy} onChangeText={(value) => { setCode(value); clearFeedback(); }} />
              <FormField label="New password" icon="lock-closed-outline" password autoComplete="new-password" textContentType="newPassword" autoCapitalize="none" autoCorrect={false} helperText="At least 8 characters; up to 72 UTF-8 bytes." value={password} error={errors.password} editable={!busy} onChangeText={(value) => { setPassword(value); clearFeedback(); }} />
              <FormField label="Confirm new password" icon="lock-closed-outline" password autoComplete="new-password" textContentType="newPassword" autoCapitalize="none" autoCorrect={false} value={confirmation} error={errors.confirmation} editable={!busy} onChangeText={(value) => { setConfirmation(value); clearFeedback(); }} onSubmitEditing={submit} returnKeyType="go" />
            </>
          )}
          <FormMessage message={message} />
          <Button className="h-14 rounded-2xl" disabled={busy} onPress={step === "email" ? sendCode : submit}>
            <Text>{busy ? (step === "email" ? "Sending code…" : "Please wait…") : step === "email" ? "Send reset code" : "Reset password"}</Text>
          </Button>
          {step === "reset" ? (
            <>
              <Button variant="outline" disabled={busy || remaining > 0} onPress={sendCode}><Text>{remaining > 0 ? `Resend code in ${remaining}s` : "Send a new code"}</Text></Button>
              <Button variant="ghost" disabled={busy} onPress={() => { setStep("email"); setCode(""); setPassword(""); setConfirmation(""); setNotice(""); setResendAt(0); clearFeedback(); }}><Text>Use a different email</Text></Button>
            </>
          ) : null}
        </View>
      ) : null}
      <Link href="/login" replace asChild>
        <Button className="mt-5 h-14 rounded-2xl" variant={step === "success" ? "default" : "ghost"} disabled={busy}><Text>{step === "success" ? "Sign in" : "Back to sign in"}</Text></Button>
      </Link>
    </AuthScreen>
  );
}
