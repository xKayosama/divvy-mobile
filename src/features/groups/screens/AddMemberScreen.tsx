import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FormField, FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { AddGroupMemberResponse } from "../types";
import { authError } from "@/features/auth/errors";
import { useAppSelector } from "@/hooks/redux";
import { useTheme } from "@/theme/ThemeProvider";
import {
  useAddGroupMemberMutation,
  useGetGroupMembersQuery,
} from "../groupsApi";

export default function AddMemberScreen({ groupId }: { groupId: string }) {
  const { colors, surfaces } = useTheme();
  const userId = useAppSelector((state) => state.auth.user?.id);
  const { currentData, isLoading, isError, isFetching, error, refetch } =
    useGetGroupMembersQuery(groupId, { refetchOnMountOrArgChange: true });
  const isOwner = currentData?.data.members.some(
    (member) =>
      member.status === "ACTIVE" &&
      member.role === "OWNER" &&
      member.userId?._id === userId,
  );
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function fieldError(field: string, text: string) {
    setFieldErrors({ [field]: text });
    setMessage("Check the highlighted field and try again.");
  }

  const [added, setAdded] = useState<
    AddGroupMemberResponse["data"]["member"] | null
  >(null);
  const submitting = useRef(false);
  const [addMember, { isLoading: saving }] = useAddGroupMemberMutation();
  const unsaved = useUnsavedChanges(!added && !!email.trim(), saving);

  function back() {
    unsaved.requestLeave(() => router.navigate({
      pathname: "/groups/[groupId]/group",
      params: { groupId },
    }));
  }
  async function submit() {
    if (submitting.current || !isOwner || isError || isFetching) return;
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      fieldError("email", "Enter a valid email address.");
      return;
    }
    Keyboard.dismiss();
    submitting.current = true;
    setMessage("");
    try {
      const result = await addMember({ groupId, email: normalized }).unwrap();
      setAdded(result.data.member);
    } catch (error) {
      setMessage(authError(error, "Unable to add this member. Try again."));
    } finally {
      submitting.current = false;
    }
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 20, gap: 24, flexGrow: 1 }}
        >
          {!added ? (
            <View className="flex-row items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                accessibilityLabel="Back to group"
                disabled={saving}
                onPress={back}
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={colors.foreground}
                  accessible={false}
                />
              </Button>
              <Text className="text-3xl font-semibold">Add member</Text>
            </View>
          ) : null}
          {added ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                width: "100%",
                maxWidth: 440,
                alignSelf: "center",
                paddingVertical: 32,
                gap: 28,
              }}
            >
              <View className="items-center gap-5">
                <View
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: 52,
                    backgroundColor: colors.secondary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: colors.primary,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name="checkmark"
                      size={38}
                      color={colors.primaryForeground}
                      accessible={false}
                    />
                  </View>
                </View>
                <View className="items-center gap-2">
                  <Text
                    accessibilityRole="header"
                    accessibilityLiveRegion="polite"
                    className="text-center text-3xl font-semibold"
                  >
                    Member added!
                  </Text>
                  <Text className="text-center text-base leading-6 text-muted-foreground">
                    {added.firstName} is now part of your group. You’re ready to
                    share expenses together.
                  </Text>
                </View>
              </View>
              <View
                className="gap-4 rounded-[24px] bg-card p-5"
                style={surfaces.card}
              >
                <View className="flex-row items-center gap-3">
                  <UserAvatar
                    firstName={added.firstName}
                    lastName={added.lastName}
                    size={52}
                  />
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-lg font-semibold">
                      {added.firstName} {added.lastName}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {added.email}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center justify-between border-t border-border pt-4">
                  <Text className="text-sm text-muted-foreground">
                    Group access
                  </Text>
                  <View className="flex-row items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5">
                    <Ionicons
                      name="person-outline"
                      size={13}
                      color={colors.secondaryForeground}
                      accessible={false}
                    />
                    <Text className="text-xs font-semibold text-secondary-foreground">
                      Member
                    </Text>
                  </View>
                </View>
              </View>
              <View className="gap-3">
                <Button className="min-h-14" onPress={back}>
                  <Text>View group</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={colors.primaryForeground}
                    accessible={false}
                  />
                </Button>
                <Button
                  variant="ghost"
                  onPress={() => {
                    setAdded(null);
                    setEmail("");
                    setMessage("");
                  }}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={18}
                    color={colors.primary}
                    accessible={false}
                  />
                  <Text className="text-primary">Add another member</Text>
                </Button>
              </View>
            </View>
          ) : isLoading ? (
            <ActivityIndicator accessibilityLabel="Checking group access" />
          ) : isError ? (
            <View className="gap-3">
              <Text accessibilityLiveRegion="polite">
                {authError(error, "Unable to check group access.")}
              </Text>
              <Button disabled={isFetching} onPress={() => void refetch()}>
                <Text>Retry</Text>
              </Button>
            </View>
          ) : !isOwner ? (
            <Text>Only the group owner can add members.</Text>
          ) : (
            <>
              <Text className="text-sm text-muted-foreground">
                Add someone using the email address they registered with on
                Divvy. They’ll be added directly to this group.
              </Text>
              <View className="gap-4 rounded-[24px] bg-card p-5">
                <FormField
                  label="Email address"
                    returnKeyType="done"
                    onSubmitEditing={() => void submit()}
                  icon="mail-outline"
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
              error={fieldErrors.email}
                  onChangeText={value => { setEmail(value); setFieldErrors({}); setMessage(""); }}
                  editable={!saving}
                />
                <FormMessage message={message} />
              </View>
              <Button
                disabled={saving || isFetching}
                onPress={() => void submit()}
              >
                <Text>{saving ? "Adding…" : "Add member"}</Text>
              </Button>
            </>
          )}
          {!added ? (
            <Button variant="ghost" disabled={saving} onPress={back}>
              <Text>Cancel</Text>
            </Button>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      {unsaved.dialog}
    </SafeAreaView>
  );
}
