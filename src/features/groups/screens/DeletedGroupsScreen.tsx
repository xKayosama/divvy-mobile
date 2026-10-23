import { useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { FormMessage } from "@/components/auth/FormField";
import { authError } from "@/features/auth/errors";
import {
  useGetDeletedGroupsQuery,
  useRestoreGroupMutation,
} from "../groupsApi";
export default function DeletedGroupsScreen() {
  const { currentData, isFetching, isError, error, refetch } =
    useGetDeletedGroupsQuery(undefined, { refetchOnMountOrArgChange: true });
  const [restore, { isLoading }] = useRestoreGroupMutation();
  const [message, setMessage] = useState("");
  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={isError ? [] : (currentData?.data.groups ?? [])}
        keyExtractor={(group) => group.id}
        refreshing={isFetching}
        onRefresh={() => void refetch()}
        contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1 }}
        ListHeaderComponent={
          <View className="gap-4">
            <Button
              variant="outline"
              onPress={() => router.navigate("/groups")}
            >
              <Text>Back to groups</Text>
            </Button>
            <Text accessibilityRole="header" className="text-2xl font-semibold">
              Deleted groups
            </Text>
            <Text className="text-sm text-muted-foreground">
              Only groups you own appear here. All records are preserved.
              Restored recurring expenses stay paused; recurring bills skip
              missed dates.
            </Text>
            <FormMessage message={message} />
            {isError ? (
              <>
                <FormMessage
                  message={authError(error, "Could not load deleted groups.")}
                />
                <Button onPress={() => void refetch()}>
                  <Text>Retry</Text>
                </Button>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isFetching ? (
            <ActivityIndicator accessibilityLabel="Loading deleted groups" />
          ) : !isError ? (
            <Text>No deleted groups.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View className="gap-3 rounded-[24px] bg-card p-5">
            <Text className="text-lg font-semibold">{item.name}</Text>
            <Text className="text-sm text-muted-foreground">
              Deleted {new Date(item.deletedAt).toLocaleDateString()} ·{" "}
              {item.currency}
            </Text>
            <Button
              disabled={isLoading}
              onPress={async () => {
                setMessage("");
                try {
                  await restore(item.id).unwrap();
                } catch (error) {
                  setMessage(authError(error, "Could not restore this group."));
                }
              }}
            >
              <Text>{isLoading ? "Restoring…" : "Restore group"}</Text>
            </Button>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
