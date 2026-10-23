import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { CurrencySelector } from "../components/CurrencySelector";
import type { GroupCurrency } from "../currencies";
import { GroupIconSelector } from "../components/GroupIconSelector";
import { resolveGroupIcon, type GroupIcon } from "../groupIcons";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/theme/ThemeProvider";
import type { GroupMember } from "../types";
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
import { authError } from "@/features/auth/errors";
import { useAppSelector } from "@/hooks/redux";
import {
  useSoftDeleteGroupMutation,
  useGetGroupMembersQuery,
  useGetMyGroupsQuery,
  useGetGroupDetailsQuery,
  useRemoveGroupMemberMutation,
  useRenameGroupMutation,
} from "../groupsApi";

export default function ManageGroupScreen({
  groupId,
  memberUserId,
}: {
  groupId: string;
  memberUserId?: string;
}) {
  const { colors, surfaces } = useTheme();
  const [removedUser, setRemovedUser] = useState<GroupMember["userId"]>(null);
  const userId = useAppSelector((state) => state.auth.user?.id);
  const membersQuery = useGetGroupMembersQuery(groupId, {
    refetchOnMountOrArgChange: true,
  });
  const groupsQuery = useGetMyGroupsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const group = groupsQuery.currentData?.data.groups.find(
    (item) => item.id === groupId,
  );
  const currencyQuery = useGetGroupDetailsQuery(groupId, {
    skip: !!memberUserId,
    refetchOnMountOrArgChange: true,
  });
  const canChangeCurrency = !currencyQuery.isError && !currencyQuery.isFetching &&
    currencyQuery.currentData?.data.group.canChangeCurrency === true;
  const [currency, setCurrency] = useState<GroupCurrency | undefined>();
  const currencyChanged = currency !== undefined && currency !== group?.currency;
  const members = membersQuery.currentData?.data.members ?? [];
  const isOwner = members.some(
    (item) =>
      item.status === "ACTIVE" &&
      item.role === "OWNER" &&
      item.userId?._id === userId,
  );
  const target = members.find(
    (item) => item.status === "ACTIVE" && item.userId?._id === memberUserId,
  );
  const canRemove = target?.role === "MEMBER" && memberUserId !== userId;
  const fetching = membersQuery.isFetching || groupsQuery.isFetching;
  const error = membersQuery.isError
    ? membersQuery.error
    : groupsQuery.isError
      ? groupsQuery.error
      : undefined;
  const [icon, setIcon] = useState<GroupIcon | undefined>();
  const [name, setName] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function fieldError(field: string, text: string) {
    setFieldErrors({ [field]: text });
    setMessage("Check the highlighted field and try again.");
  }

  const [done, setDone] = useState(false);
  const submitting = useRef(false);
  const [removeMember, { isLoading: removing }] =
    useRemoveGroupMemberMutation();
  const [renameGroup, { isLoading: renaming }] = useRenameGroupMutation();
  const [softDelete,{isLoading:deletingGroup}]=useSoftDeleteGroupMutation();
  const [confirmSoftDelete,setConfirmSoftDelete]=useState(false);
  const [deleteMessage,setDeleteMessage]=useState("");
  const saving = removing || renaming || deletingGroup;
  const unsaved = useUnsavedChanges(!done && !memberUserId && (currencyChanged || (name !== undefined && name !== group?.name) || (icon !== undefined && icon !== resolveGroupIcon(group?.icon).value)), saving);

  function back() {
    unsaved.requestLeave(() => router.navigate({
      pathname: "/groups/[groupId]/group",
      params: { groupId },
    }));
  }
  function closeSoftDelete() {
    if (submitting.current || deletingGroup) return;
    setConfirmSoftDelete(false);
    setDeleteMessage("");
  }
  async function deleteGroup() {
    if (submitting.current || saving || fetching || error || !isOwner || !group || memberUserId || !confirmSoftDelete) return;
    submitting.current = true;
    setDeleteMessage("");
    try {
      await softDelete(groupId).unwrap();
      setConfirmSoftDelete(false);
      unsaved.complete(() => router.navigate("/groups"));
    } catch (error) {
      setDeleteMessage(authError(error,"Could not soft delete the group. Refresh and retry."));
    } finally {
      submitting.current = false;
    }
  }
  async function save() {
    if (submitting.current || fetching || error || !isOwner || !group) return;
    if (memberUserId && (!target || !canRemove)) return;
    const nextName = (name ?? group.name).trim();
    if (!memberUserId && !nextName) {
      fieldError("name", "Enter a group name.");
      return;
    }
    if (!memberUserId && currencyChanged && !canChangeCurrency) {
      setMessage("Currency can only change before any expenses, bills or payments are recorded. Check the currency status below.");
      return;
    }
    Keyboard.dismiss();
    submitting.current = true;
    setMessage("");
    try {
      if (memberUserId) {
        const removed = target?.userId ?? null;
        await removeMember({ groupId, userId: memberUserId }).unwrap();
        setRemovedUser(removed);
      } else await renameGroup({ groupId, name: nextName, ...(icon !== undefined ? { icon } : {}), ...(currencyChanged ? { currency } : {}) }).unwrap();
      setDone(true);
    } catch (error) {
      if (currencyChanged && error && typeof error === "object" && "status" in error && error.status === 409) {
        setCurrency(undefined);
        void currencyQuery.refetch();
      }
      setMessage(
        authError(
          error,
          memberUserId
            ? "Could not remove this member. Try again."
            : "Could not update this group. Try again.",
        ),
      );
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
          {!done ? (
            <Text className="text-3xl font-semibold">
              {memberUserId ? "Remove member" : "Group settings"}
            </Text>
          ) : null}
          {done ? (
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
                <Text
                  accessibilityRole="header"
                  accessibilityLiveRegion="polite"
                  className="text-center text-3xl font-semibold"
                >
                  {memberUserId ? "Member removed" : "Group updated"}
                </Text>
                <Text className="text-center text-base leading-6 text-muted-foreground">
                  {memberUserId
                    ? `${removedUser?.firstName ?? "This member"} no longer has access to your group.`
                    : "Your group settings are ready for everyone."}
                </Text>
              </View>
              {memberUserId && removedUser ? (
                <View
                  className="gap-4 rounded-[24px] bg-card p-5"
                  style={surfaces.card}
                >
                  <View className="flex-row items-center gap-3">
                    <UserAvatar
                      firstName={removedUser.firstName}
                      lastName={removedUser.lastName}
                      imageUrl={removedUser.avatar}
                      size={52}
                    />
                    <View className="min-w-0 flex-1 gap-1">
                      <Text className="text-lg font-semibold">
                        {removedUser.firstName} {removedUser.lastName}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {removedUser.email}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2 border-t border-border pt-4">
                    <Ionicons
                      name="lock-closed-outline"
                      size={15}
                      color={colors.mutedForeground}
                      accessible={false}
                    />
                    <Text className="text-sm text-muted-foreground">
                      Group access removed
                    </Text>
                  </View>
                </View>
              ) : null}
              {memberUserId ? (
                <Text className="text-center text-sm leading-5 text-muted-foreground">
                  Past records are preserved. You can add them again later using
                  their registered email.
                </Text>
              ) : null}
              <Button className="min-h-14" onPress={back}>
                <Text>View group</Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.primaryForeground}
                  accessible={false}
                />
              </Button>
            </View>
          ) : membersQuery.isLoading || groupsQuery.isLoading ? (
            <ActivityIndicator accessibilityLabel="Loading group" />
          ) : error ? (
            <View className="gap-3">
              <Text accessibilityLiveRegion="polite">
                {authError(error, "Unable to load group details.")}
              </Text>
              <Button
                disabled={fetching}
                onPress={() => {
                  void membersQuery.refetch();
                  void groupsQuery.refetch();
                }}
              >
                <Text>Retry</Text>
              </Button>
            </View>
          ) : !isOwner || !group ? (
            <Text>Only the group owner can manage this group.</Text>
          ) : memberUserId && (!target || !canRemove) ? (
            <Text>
              This member cannot be removed. The owner cannot remove themselves.
            </Text>
          ) : (
            <>
              {memberUserId ? (
                <View
                  className="gap-5 rounded-[24px] bg-card p-5"
                  style={surfaces.card}
                >
                  <View className="flex-row items-center gap-3">
                    <UserAvatar
                      firstName={target?.userId?.firstName}
                      lastName={target?.userId?.lastName}
                      imageUrl={target?.userId?.avatar}
                      size={52}
                    />
                    <View className="min-w-0 flex-1 gap-1">
                      <Text className="text-lg font-semibold">
                        {target?.userId?.firstName} {target?.userId?.lastName}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {target?.userId?.email}
                      </Text>
                    </View>
                  </View>
                  <View className="gap-3 border-t border-border pt-5">
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name="person-remove-outline"
                        size={20}
                        color={colors.destructive}
                        accessible={false}
                      />
                      <Text className="flex-1 text-lg font-semibold">
                        Remove from {group.name}?
                      </Text>
                    </View>
                    <Text className="text-sm leading-6 text-muted-foreground">
                      They will lose access to the group and can no longer be
                      selected for new expenses or bill payments.
                    </Text>
                  </View>
                  <View className="gap-2 rounded-2xl bg-secondary p-4">
                    <Text className="text-sm font-semibold text-secondary-foreground">
                      Your history stays
                    </Text>
                    <Text className="text-sm leading-5 text-muted-foreground">
                      Past records remain. Removing a member does not settle
                      outstanding balances. You can add them again later.
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="gap-4 rounded-[24px] bg-card p-5">
                  <FormField
                    label="Group name"
                    returnKeyType="done"
                    onSubmitEditing={() => void save()}
                    icon="people-outline"
                    value={name ?? group.name}
                    error={fieldErrors.name}
                    onChangeText={value => { setName(value); setFieldErrors({}); setMessage(""); }}
                    editable={!saving}
                    autoCapitalize="words"
                  />
                  <GroupIconSelector value={icon ?? resolveGroupIcon(group.icon).value} onChange={setIcon} disabled={saving} />
                  <CurrencySelector
                    value={currency ?? group.currency}
                    onChange={value => { setCurrency(value); setMessage(""); }}
                    disabled={saving || !canChangeCurrency}
                  />
                  <View className="gap-2">
                    <Text className="text-sm text-muted-foreground" accessibilityLiveRegion="polite">
                      {currencyQuery.isFetching
                        ? "Checking whether the currency can be changed…"
                        : currencyQuery.isError || currencyQuery.currentData?.data.group.canChangeCurrency === undefined
                          ? "Could not check whether the currency can be changed. Try again."
                          : canChangeCurrency
                            ? "You can change currency until the first expense, bill or payment is recorded."
                            : "Currency is locked because this group has recorded expenses, bills or payments."}
                    </Text>
                    {currencyQuery.isError || (!currencyQuery.isFetching && currencyQuery.currentData?.data.group.canChangeCurrency === undefined) ? (
                      <Button variant="outline" disabled={currencyQuery.isFetching} onPress={() => void currencyQuery.refetch()}><Text>Check currency status</Text></Button>
                    ) : null}
                    {currencyChanged && !canChangeCurrency ? (
                      <Button variant="ghost" onPress={() => setCurrency(undefined)}><Text>Keep {group.currency}</Text></Button>
                    ) : null}
                  </View>
                </View>
              )}
              <FormMessage message={message} />
              <Button
                variant={memberUserId ? "destructive" : "default"}
                disabled={saving || fetching}
                onPress={() => void save()}
              >
                <Text>
                  {saving
                    ? memberUserId
                      ? "Removing…"
                      : "Saving…"
                    : memberUserId
                      ? "Remove member"
                      : "Save changes"}
                </Text>
              </Button>
              {!memberUserId ? <View className="gap-3 rounded-2xl border border-destructive/30 p-4">
                <Text className="font-semibold">Soft delete group</Text>
                <Text className="text-sm text-muted-foreground">Hide this group for all members while preserving expenses, bills and payments. Restore it later from Deleted groups. Recurring expenses will stay paused after restoration.</Text>
                <Button variant="outline" disabled={saving||fetching} onPress={()=>{Keyboard.dismiss();setDeleteMessage("");setConfirmSoftDelete(true);}}><Text className="text-destructive">Soft delete group</Text></Button>
              </View>:null}

            </>
          )}
          {!done ? (
            <Button variant="ghost" disabled={saving} onPress={back}>
              <Text>Cancel</Text>
            </Button>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <DeleteConfirmationModal
        visible={confirmSoftDelete && !!group && isOwner && !memberUserId && !done && !error}
        title="Soft delete group?"
        name={group?.name ?? ""}
        message={deleteMessage}
        busy={deletingGroup}
        disabled={saving || fetching}
        confirmLabel="Soft delete group"
        cancelLabel="Keep group"
        onClose={closeSoftDelete}
        onConfirm={() => void deleteGroup()}
      >
        <Text className="text-sm text-muted-foreground">This hides the group for all members. Expenses, bills and payments are preserved. Restore it later from Deleted groups.</Text>
        <Text className="text-sm text-muted-foreground">Recurring expenses will stay paused after restoration. Unsaved settings will not be saved.</Text>
      </DeleteConfirmationModal>
      {unsaved.dialog}
    </SafeAreaView>
  );
}
