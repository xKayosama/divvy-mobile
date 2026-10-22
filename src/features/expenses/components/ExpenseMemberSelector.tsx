import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { FormField, FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useTheme } from "@/theme/ThemeProvider";
import type { ExpenseUser } from "../types";

type Props = {
  members: ExpenseUser[];
  currentUserId?: string;
  disabled: boolean;
  error?: string;
} & (
  | { mode: "single"; value: string; onChange: (id: string) => void }
  | { mode: "multiple"; value: string[]; onChange: (ids: string[]) => void }
);

export function ExpenseMemberSelector(props: Props) {
  const { members, currentUserId, disabled, error } = props;
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<string[]>([]);
  const single = props.mode === "single";
  const ids =
    props.mode === "single" ? [props.value].filter(Boolean) : props.value;
  const selected = ids.flatMap(
    (id) => members.find((member) => member._id === id) ?? [],
  );
  const missingCount = ids.length - selected.length;
  const allSelected =
    members.length > 0 && selected.length === members.length && !missingCount;
  const name = (member: ExpenseUser) =>
    `${member.firstName} ${member.lastName}${member._id === currentUserId ? " (you)" : ""}`;
  const summary = single
    ? selected[0]
      ? name(selected[0])
      : "Choose who paid"
    : !selected.length
      ? "Choose members"
      : allSelected
        ? `Everyone (${selected.length})`
        : `${selected.length} ${selected.length === 1 ? "person" : "people"} selected`;
  const activeIds = members.map((member) => member._id);
  const query = search.trim().toLowerCase();
  const filtered = members.filter((member) =>
    `${member.firstName} ${member.lastName} ${member.email} ${member._id === currentUserId ? "you" : ""}`
      .toLowerCase()
      .includes(query),
  );
  const unavailableDraft = draft.filter((id) => !activeIds.includes(id));
  function close() {
    Keyboard.dismiss();
    setOpen(false);
  }
  function begin() {
    Keyboard.dismiss();
    setDraft([...ids]);
    setSearch("");
    setOpen(true);
  }
  return (
    <View className="gap-2">
      <Text className="font-semibold">
        {single ? "Paid by" : "Split between"}
      </Text>
      <Button
        variant="outline"
        className="h-auto min-h-20 justify-start gap-3 rounded-2xl"
        disabled={disabled || !members.length}
        accessibilityLabel={`${single ? "Paid by" : "Split between"}: ${summary}. Change members`}
        accessibilityState={{ expanded: open, disabled }}
        onPress={begin}
      >
        {single && selected[0] ? (
          <UserAvatar
            firstName={selected[0].firstName}
            lastName={selected[0].lastName}
            imageUrl={selected[0].avatar}
            size={44}
          />
        ) : (
          <View className="h-11 w-11 items-center justify-center rounded-full bg-secondary">
            <Ionicons
              name={single ? "person-outline" : "people-outline"}
              size={24}
              color={colors.primary}
              accessible={false}
            />
          </View>
        )}
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-semibold">{summary}</Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={2}>
            {single
              ? "The person who paid the full amount"
              : selected.length
                ? `${selected.slice(0, 2).map(name).join(", ")}${selected.length > 2 ? ` +${selected.length - 2} more` : ""}`
                : "Choose everyone sharing this expense"}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.mutedForeground}
          accessible={false}
        />
      </Button>
      {missingCount ? (
        <Text className="text-sm text-destructive">
          {single
            ? "The previous payer is unavailable. Choose an active member."
            : `${missingCount} unavailable ${missingCount === 1 ? "member needs" : "members need"} to be removed from this split.`}
        </Text>
      ) : null}
      <FormMessage message={error ?? ""} />
      {props.mode === "single" &&
      currentUserId &&
      props.value !== currentUserId &&
      activeIds.includes(currentUserId) ? (
        <Button
          variant="ghost"
          className="self-start"
          disabled={disabled}
          onPress={() => props.onChange(currentUserId)}
        >
          <Text>I paid</Text>
        </Button>
      ) : null}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <SafeAreaProvider>
          <SafeAreaView
            className="flex-1"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          >
            <KeyboardAvoidingView
              className="flex-1 justify-end"
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <Pressable
                className="absolute inset-0"
                accessibilityRole="button"
                accessibilityLabel="Cancel member selection"
                onPress={close}
              />
              <View
                className="w-full self-center rounded-t-[28px] border border-border bg-background"
                style={{ maxHeight: "90%", maxWidth: 520 }}
                accessibilityViewIsModal
                onAccessibilityEscape={close}
              >
                <View className="flex-row items-center justify-between gap-3 px-5 pt-4">
                  <Text
                    accessibilityRole="header"
                    className="min-w-0 flex-1 text-xl font-semibold"
                  >
                    {single ? "Who paid?" : "Who’s sharing?"}
                  </Text>
                  <Button
                    variant="ghost"
                    size="icon"
                    accessibilityLabel="Cancel member selection"
                    onPress={close}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={colors.foreground}
                      accessible={false}
                    />
                  </Button>
                </View>
                <View className="gap-3 px-5 pb-3">
                  <FormField
                    label="Search members"
                    icon="search-outline"
                    placeholder="Name or email"
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {!single ? (
                    <View className="flex-row flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onPress={() => setDraft([...activeIds])}
                      >
                        <Text>Select everyone</Text>
                      </Button>
                      <Button variant="ghost" onPress={() => setDraft([])}>
                        <Text>Clear</Text>
                      </Button>
                    </View>
                  ) : null}
                </View>
                <FlatList
                  data={filtered}
                  extraData={draft}
                  keyExtractor={(member) => member._id}
                  style={{ maxHeight: 360, flexGrow: 0 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={{
                    paddingHorizontal: 20,
                    paddingBottom: 16,
                    gap: 8,
                  }}
                  ListEmptyComponent={
                    <Text className="py-5 text-center text-muted-foreground">
                      No members found. Try another name or email.
                    </Text>
                  }
                  renderItem={({ item: member }) => {
                    const checked = draft.includes(member._id);
                    return (
                      <Button
                        variant={checked ? "secondary" : "outline"}
                        className="h-auto min-h-16 justify-start gap-3 rounded-2xl"
                        disabled={disabled}
                        accessibilityRole={single ? "radio" : "checkbox"}
                        accessibilityLabel={name(member)}
                        accessibilityState={{ checked }}
                        onPress={() => {
                          if (props.mode === "single") {
                            props.onChange(member._id);
                            close();
                          } else
                            setDraft((ids) =>
                              ids.includes(member._id)
                                ? ids.filter((id) => id !== member._id)
                                : [...ids, member._id],
                            );
                        }}
                      >
                        <UserAvatar
                          firstName={member.firstName}
                          lastName={member.lastName}
                          imageUrl={member.avatar}
                          size={40}
                        />
                        <View className="min-w-0 flex-1 gap-1">
                          <Text className="font-semibold">{name(member)}</Text>
                          <Text
                            className="text-xs text-muted-foreground"
                            numberOfLines={1}
                          >
                            {member.email}
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            single
                              ? checked
                                ? "radio-button-on"
                                : "radio-button-off"
                              : checked
                                ? "checkbox"
                                : "square-outline"
                          }
                          size={23}
                          color={colors.primary}
                          accessible={false}
                        />
                      </Button>
                    );
                  }}
                />
                <View className="gap-2 border-t border-border px-5 pb-4 pt-3">
                  {!single && unavailableDraft.length ? (
                    <Button
                      variant="outline"
                      onPress={() =>
                        setDraft((ids) =>
                          ids.filter((id) => activeIds.includes(id)),
                        )
                      }
                    >
                      <Text>
                        Remove unavailable members ({unavailableDraft.length})
                      </Text>
                    </Button>
                  ) : null}
                  {props.mode === "multiple" ? (
                    <Button
                      className="min-h-14"
                      disabled={disabled || unavailableDraft.length > 0}
                      onPress={() => {
                        props.onChange([...draft]);
                        close();
                      }}
                    >
                      <Text>Use selection ({draft.length})</Text>
                    </Button>
                  ) : null}
                  <Button variant="ghost" onPress={close}>
                    <Text>Cancel</Text>
                  </Button>
                </View>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
