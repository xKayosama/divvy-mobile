import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormField, FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { QueryErrorState } from "@/components/ui/content-state";
import { useDeleteAccountMutation, useGetDeletionPreviewQuery } from "@/features/auth/authApi";
import { useSession } from "@/features/auth/SessionProvider";
import { authError, errorStatus } from "@/features/auth/errors";
import { useTheme } from "@/theme/ThemeProvider";
import { validateDeletion } from "../profileValidation";

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const { clear } = useSession();
  const preview = useGetDeletionPreviewQuery(undefined, { refetchOnMountOrArgChange: true });
  const [remove] = useDeleteAccountMutation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  function back() { if (router.canGoBack()) router.back(); else router.replace("/profile"); }
  async function deleteAccount() {
    if (lock.current || !preview.currentData || preview.isError || preview.isFetching) return;
    const invalid = validateDeletion(password, confirmation);
    if (invalid) { setMessage(invalid); return; }
    lock.current = true; setBusy(true); setMessage(""); Keyboard.dismiss();
    try {
      await remove({ password, confirmation, planHash: preview.currentData.data.planHash }).unwrap();
      setPassword(""); setConfirmation("");
      try { await clear(); } catch { /* The deleted account is already signed out in memory. */ }
    } catch (error) {
      setMessage(authError(error, "Could not delete your account. Please try again."));
      if (errorStatus(error) === 409) { setConfirmation(""); void preview.refetch(); }
    } finally { lock.current = false; setBusy(false); }
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View className="flex-row items-center gap-3">
          <Button variant="outline" size="icon" accessibilityLabel="Back to profile" disabled={busy} onPress={back}><Ionicons name="chevron-back" size={22} color={colors.foreground} accessible={false} /></Button>
          <Text accessibilityRole="header" className="flex-1 text-2xl font-semibold">Delete account</Text>
        </View>
        <View className="gap-3 rounded-3xl border border-destructive/30 bg-card p-5">
          <Text className="text-lg font-semibold text-destructive">This cannot be undone</Text>
          <Text className="text-sm leading-6 text-muted-foreground">Your name, email, password, avatar, notification history and push registrations will be removed. You will be signed out on all devices.</Text>
          <Text className="text-sm leading-6 text-muted-foreground">Shared expenses, bills and settlements stay available to other members under “Deleted account.” Deletion does not settle or forgive outstanding balances.</Text>
          <Text className="text-sm leading-6 text-muted-foreground">Shared groups you own transfer to the longest-standing active member. Groups with no other active members are permanently deleted, including their records. Any remaining cleanup finishes automatically.</Text>
        </View>
        {preview.isLoading ? <ActivityIndicator accessibilityLabel="Checking your groups" color={colors.primary} /> : null}
        {preview.isError ? <QueryErrorState subject="Account deletion details" error={preview.error} busy={preview.isFetching} onRetry={() => void preview.refetch()} /> : null}
        {preview.currentData && !preview.isError ? <View className="gap-3 rounded-3xl bg-card p-5">
          <Text className="text-lg font-semibold">Your owned groups</Text>
          {!preview.currentData.data.groups.length ? <Text className="text-sm text-muted-foreground">You don’t own any groups. Your shared history in other groups will be retained anonymously.</Text> : null}
          {preview.currentData.data.groups.map(group => <View key={group.id} className="gap-1 border-t border-border pt-3">
            <Text className="font-semibold">{group.name}{group.deleted ? " (deleted group)" : ""}</Text>
            <Text className="text-sm text-muted-foreground">{group.action === "TRANSFER" && group.successor ? `New owner: ${group.successor.firstName} ${group.successor.lastName}` : "Permanently deleted with all its records"}</Text>
          </View>)}
        </View> : null}
        <FormMessage message={message} />
        <FormField label="Current password" icon="lock-closed-outline" password value={password} onChangeText={setPassword} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="current-password" />
        <FormField label="Type DELETE to confirm" icon="warning-outline" value={confirmation} onChangeText={setConfirmation} editable={!busy} autoCapitalize="characters" autoCorrect={false} maxLength={6} />
        <Button variant="destructive" disabled={busy || !preview.currentData || preview.isError || preview.isFetching || confirmation !== "DELETE" || !password} onPress={() => void deleteAccount()}><Text>{busy ? "Deleting account…" : "Permanently delete my account"}</Text></Button>
        <Button variant="outline" disabled={busy} onPress={back}><Text>Keep my account</Text></Button>
      </ScrollView>
    </SafeAreaView>
  );
}
