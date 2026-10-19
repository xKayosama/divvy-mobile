import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormField, FormMessage } from "@/components/auth/FormField";
import { authError } from "@/features/auth/errors";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useCreateGroupMutation } from "../groupsApi";

export default function CreateGroupScreen() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function fieldError(field: string, text: string) {
    setFieldErrors({ [field]: text });
    setMessage("Check the highlighted field and try again.");
  }

  const [createGroup, { isLoading }] = useCreateGroupMutation();
  const submitting = useRef(false);

  const unsaved = useUnsavedChanges(!!name.trim(), isLoading);

  async function handleCreate() {
    if (submitting.current) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      fieldError("name", "Enter a group name.");
      return;
    }

    Keyboard.dismiss();
    submitting.current = true;
    setMessage("");

    try {
      await createGroup({ name: trimmedName }).unwrap();
      unsaved.complete(() => router.replace("/groups"));
    } catch (error) {
      setMessage(authError(error, "Could not create the group. Please try again."));
    } finally {
      submitting.current = false;
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 24, flexGrow: 1 }}
      >
        <Text className="mb-2 text-2xl font-semibold">
          Create a group
        </Text>

        <Text className="mb-6 text-muted-foreground">
          Start sharing expenses with your household or friends.
        </Text>

        <View className="gap-4">
          <FormField
            label="Group name"
            icon="people-outline"
            placeholder="Our home"
            value={name}
            error={fieldErrors.name}
            onChangeText={(value) => {
              setName(value);
              setFieldErrors({});
              setMessage("");
            }}
            editable={!isLoading}
            autoCapitalize="sentences"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />

          <Text className="text-sm text-muted-foreground">
            Currency: PHP
          </Text>

          <FormMessage message={message} />

          <Button
            className="h-14"
            onPress={handleCreate}
            disabled={isLoading}
          >
            <Text>
              {isLoading ? "Creating…" : "Create group"}
            </Text>
          </Button>

          <Button
            variant="ghost"
            disabled={isLoading}
            onPress={() => unsaved.requestLeave(() => router.replace("/groups"))}
          >
            <Text>Cancel</Text>
          </Button>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      {unsaved.dialog}
    </SafeAreaView>
  );
}