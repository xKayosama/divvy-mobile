import { router, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormField, FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { QueryErrorState } from "@/components/ui/content-state";
import { authError } from "@/features/auth/errors";
import { useAppSelector } from "@/hooks/redux";
import { useTheme } from "@/theme/ThemeProvider";
import { useAcceptInvitationMutation, useDeclineInvitationMutation, useGetInvitationsQuery, useLookupInvitationMutation, type Invitation } from "../invitationsApi";

export default function InvitationsScreen() {
  const { colors } = useTheme();
  const email = useAppSelector(state => state.auth.user?.email);
  const { currentData, isLoading, isFetching, isError, error, refetch } = useGetInvitationsQuery(undefined, { refetchOnMountOrArgChange: true, pollingInterval: 30000 });
  const [lookup, lookupState] = useLookupInvitationMutation();
  const [accept, acceptState] = useAcceptInvitationMutation();
  const [decline, declineState] = useDeclineInvitationMutation();
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<Invitation | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [joined, setJoined] = useState<Invitation["group"] | null>(null);
  const lock = useRef(false);
  const busy = lookupState.isLoading || acceptState.isLoading || declineState.isLoading;
  useFocusEffect(useCallback(() => { void refetch(); }, [refetch]));
  async function find() {
    if (lock.current) return;
    setMessage(""); setNotice(""); setPreview(null); setJoined(null);
    if (!/^[a-f0-9]{32}$/i.test(code.trim())) { setMessage("Enter the 32-character invitation code shared by the owner."); return; }
    Keyboard.dismiss(); lock.current = true;
    try { const response = await lookup(code).unwrap(); setPreview(response.data.invitation); }
    catch (error) { setMessage(authError(error, "Could not check this invitation.")); }
    finally { lock.current = false; }
  }
  async function respond(invitation: Invitation, accepting: boolean) {
    if (lock.current) return;
    lock.current = true; setMessage(""); setNotice(""); setJoined(null);
    try {
      const answer = { id: invitation.id, createdAt: invitation.createdAt };
      const result = await (accepting ? accept({ ...answer, code }) : decline(answer)).unwrap();
      setPreview(null); setCode(""); setNotice(result.message);
      if (accepting) setJoined(result.data.invitation.group);
    } catch (error) {
      setPreview(null);
      setMessage(authError(error, "Could not respond. Refresh and try again."));
    } finally { lock.current = false; }
  }
  const invitations = currentData?.data.invitations ?? [];
  const cards = preview ? [preview, ...invitations.filter(item => item.id !== preview.id)] : invitations;
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View className="flex-row items-center gap-3">
          <Button variant="outline" size="icon" accessibilityLabel="Back to groups" disabled={busy} onPress={() => router.navigate("/groups")}>
            <Ionicons name="chevron-back" size={22} color={colors.foreground} accessible={false} />
          </Button>
          <Text accessibilityRole="header" className="flex-1 text-2xl font-semibold">Invitations</Text>
        </View>
        <Text className="text-sm leading-6 text-muted-foreground">Invitations for {email}. Only accept groups you recognize. To use another invited email, sign out and sign in with that account.</Text>
        <View className="gap-4 rounded-3xl bg-card p-5">
          <FormField label="Invitation code" icon="key-outline" placeholder="Paste a code from the group owner" autoCapitalize="none" autoCorrect={false} value={code} maxLength={64} editable={!busy} onChangeText={value => { setCode(value); setPreview(null); setMessage(""); }} onSubmitEditing={find} returnKeyType="go" />
          <Button variant="outline" disabled={busy} onPress={find}><Text>{lookupState.isLoading ? "Checking…" : "Review invitation"}</Text></Button>
        </View>
        <FormMessage message={message} />
        {notice ? <View className="gap-3 rounded-2xl bg-secondary p-4"><Text accessibilityLiveRegion="polite">{notice}</Text>{joined ? <Button onPress={() => router.replace({ pathname: "/groups/[groupId]/home", params: { groupId: joined.id } })}><Text>Open {joined.name}</Text></Button> : null}</View> : null}
        <View className="flex-row items-center justify-between"><Text className="text-lg font-semibold">Pending invitations</Text><Button variant="ghost" disabled={isFetching || busy} onPress={() => { setPreview(null); void refetch(); }}><Text>Refresh</Text></Button></View>
        {isLoading ? <ActivityIndicator accessibilityLabel="Loading invitations" /> : isError ? <QueryErrorState error={error} subject="Invitations" busy={isFetching} onRetry={() => void refetch()} /> : null}
        {!isError && !isLoading && !cards.length ? <Text className="text-muted-foreground">No pending invitations. Ask a group owner to invite your email address.</Text> : null}
        {(!isError || preview) ? cards.map(invitation => <View key={`${invitation.id}:${invitation.createdAt}`} className="gap-4 rounded-3xl bg-card p-5">
          <Text className="text-xl font-semibold">{invitation.group.name}</Text>
          <Text className="text-sm text-muted-foreground">{invitation.group.currency} · invited as {invitation.email}</Text>
          <Text className="text-xs text-muted-foreground">Expires {new Date(invitation.expiresAt).toLocaleString()}</Text>
          <Text className="text-sm leading-5 text-muted-foreground">Enter the owner’s shared code above to review and accept this invitation.</Text>
          <Button disabled={busy || preview?.id !== invitation.id} onPress={() => void respond(invitation, true)}><Text>{acceptState.isLoading ? "Joining…" : "Accept invitation"}</Text></Button>
          <Button variant="outline" disabled={busy} onPress={() => void respond(invitation, false)}><Text>Decline</Text></Button>
        </View>) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
