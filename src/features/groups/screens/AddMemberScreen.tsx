import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, ScrollView, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormField, FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { QueryErrorState } from "@/components/ui/content-state";
import { authError } from "@/features/auth/errors";
import { useAppSelector } from "@/hooks/redux";
import { useTheme } from "@/theme/ThemeProvider";
import { useGetGroupMembersQuery } from "../groupsApi";
import { useCreateInvitationMutation, useGetGroupInvitationsQuery, useRevokeInvitationMutation, type Invitation } from "../invitationsApi";

export default function AddMemberScreen({ groupId }: { groupId: string }) {
  const { colors } = useTheme();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const members = useGetGroupMembersQuery(groupId, { refetchOnMountOrArgChange: true });
  const isOwner = members.currentData?.data.members.some(member => member.status === "ACTIVE" && member.role === "OWNER" && member.userId?._id === userId) && !members.isError;
  const invites = useGetGroupInvitationsQuery(groupId, { skip: !isOwner, refetchOnMountOrArgChange: true });
  const [create, createState] = useCreateInvitationMutation();
  const [revoke, revokeState] = useRevokeInvitationMutation();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [message, setMessage] = useState("");
  const [created, setCreated] = useState<{ invitation: Invitation; code: string } | null>(null);
  const lock = useRef(false);
  const busy = createState.isLoading || revokeState.isLoading;
  const { refetch: refreshMembers } = members;
  useFocusEffect(useCallback(() => { void refreshMembers(); }, [refreshMembers]));

  async function submit() {
    if (lock.current || !isOwner || members.isFetching) return;
    const normalized = email.trim().toLowerCase();
    setMessage(""); setFieldError("");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) { setFieldError("Enter a valid email address."); return; }
    Keyboard.dismiss(); lock.current = true;
    try {
      const response = await create({ groupId, email: normalized }).unwrap();
      setCreated(response.data); setEmail("");
    } catch (error) { setMessage(authError(error, "Could not create the invitation.")); }
    finally { lock.current = false; }
  }
  async function revokeInvite(invitation: Invitation) {
    if (lock.current) return;
    lock.current = true; setMessage("");
    try {
      await revoke({ groupId, id: invitation.id, createdAt: invitation.createdAt }).unwrap();
      if (created?.invitation.id === invitation.id) setCreated(null);
    } catch (error) { setMessage(authError(error, "Could not revoke this invitation.")); }
    finally { lock.current = false; }
  }
  async function shareCode() {
    if (!created) return;
    try {
      await Share.share({ message: `You’re invited to ${created.invitation.group.name} on Divvy. Sign in or register with ${created.invitation.email}, open Invitations from Your groups, and enter this code to accept. Invitation code: ${created.code}. Expires ${new Date(created.invitation.expiresAt).toLocaleDateString()}.` });
    } catch { setMessage("Sharing is unavailable. You can select and copy the code below."); }
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS === "ios"} contentContainerStyle={{ padding: 20, gap: 20 }}>
        <View className="flex-row items-center gap-3">
          <Button variant="outline" size="icon" accessibilityLabel="Back to group" disabled={busy} onPress={() => router.navigate({ pathname: "/groups/[groupId]/group", params: { groupId } })}><Ionicons name="chevron-back" size={22} color={colors.foreground} /></Button>
          <Text accessibilityRole="header" className="flex-1 text-2xl font-semibold">Invite members</Text>
        </View>
        {members.isLoading ? <ActivityIndicator accessibilityLabel="Checking group ownership" /> : members.isError ? <QueryErrorState error={members.error} subject="Group membership" busy={members.isFetching} onRetry={() => void members.refetch()} /> : !isOwner ? <Text>Only the group owner can invite members.</Text> : (
          <>
            <View className="gap-4 rounded-3xl bg-card p-5">
              <Text className="text-sm leading-6 text-muted-foreground">Invite someone by email. They can register or sign in with that email and enter the shared code in Invitations to accept. They won’t have group access until they accept. Invitations expire after seven days.</Text>
              <FormField label="Recipient email" icon="mail-outline" autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" placeholder="friend@example.com" value={email} editable={!busy} error={fieldError} onChangeText={value => { setEmail(value); setFieldError(""); setMessage(""); }} onSubmitEditing={submit} returnKeyType="send" />
              <Button disabled={busy || members.isFetching} onPress={submit}><Text>{createState.isLoading ? "Creating…" : "Create invitation"}</Text></Button>
              <Text className="text-xs text-muted-foreground">Share the code yourself. No email notification is sent.</Text>
            </View>
            {created ? <View className="gap-4 rounded-3xl border border-primary bg-card p-5">
              <Text accessibilityLiveRegion="polite" className="text-lg font-semibold">Invitation created</Text>
              <Text>{created.invitation.email}</Text>
              <Text selectable className="text-lg font-semibold" accessibilityLabel={`Invitation code ${created.code}`}>{created.code}</Text>
              <Text className="text-sm text-muted-foreground">Save or share this code now; it’s only shown once. The recipient needs this code to accept from their invitation inbox.</Text>
              <Text className="text-xs text-muted-foreground">Expires {new Date(created.invitation.expiresAt).toLocaleString()}</Text>
              {Platform.OS !== "web" ? <Button variant="outline" disabled={busy} onPress={shareCode}><Text>Share invitation</Text></Button> : <Text className="text-sm text-muted-foreground">Select the code above to copy and share it.</Text>}
            </View> : null}
            <FormMessage message={message} />
            <View className="gap-3">
              <View className="flex-row items-center justify-between gap-2"><Text className="text-lg font-semibold">Recent invitations</Text><Button variant="ghost" disabled={invites.isFetching || busy} onPress={() => void invites.refetch()}><Text>Refresh</Text></Button></View>
              {invites.isLoading ? <ActivityIndicator /> : invites.isError ? <QueryErrorState error={invites.error} subject="Invitations" busy={invites.isFetching} onRetry={() => void invites.refetch()} /> : !invites.currentData?.data.invitations.length ? <Text className="text-muted-foreground">No invitations yet.</Text> : invites.currentData.data.invitations.map(invitation => (
                <View key={invitation.id} className="gap-3 rounded-2xl bg-card p-4">
                  <Text className="font-semibold">{invitation.email}</Text>
                  <Text className="text-sm text-muted-foreground">{invitation.status.charAt(0) + invitation.status.slice(1).toLowerCase()} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</Text>
                  {invitation.status === "PENDING" ? <Button variant="outline" disabled={busy} onPress={() => void revokeInvite(invitation)}><Text>Revoke invitation</Text></Button> : null}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
