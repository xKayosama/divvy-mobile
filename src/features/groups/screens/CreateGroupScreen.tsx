import { router } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormField, FormMessage } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useCreateGroupMutation } from "../groupsApi";

export default function CreateGroupScreen() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [createGroup, { isLoading }] = useCreateGroupMutation();
  const submitting = useRef(false);

  async function handleCreate() {
    if (submitting.current) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setMessage("Enter a group name.");
      return;
    }

    submitting.current = true;
    setMessage("");

    try {
      await createGroup({ name: trimmedName }).unwrap();
      router.replace("/groups");
    } catch {
      setMessage("Could not create the group. Please try again.");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
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
            onChangeText={(value) => {
              setName(value);
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
            onPress={() => router.replace("/groups")}
          >
            <Text>Cancel</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}