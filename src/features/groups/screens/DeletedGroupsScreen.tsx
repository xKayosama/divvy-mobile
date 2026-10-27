import { useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, FlatList, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { FormMessage } from "@/components/auth/FormField";
import { authError } from "@/features/auth/errors";
import { useTheme } from "@/theme/ThemeProvider";
import {
  useGetDeletedGroupsQuery,
  useRestoreGroupMutation,
} from "../groupsApi";
export default function DeletedGroupsScreen() {
  const { colors } = useTheme();
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
            <View className="flex-row items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                accessibilityLabel="Back to groups"
                onPress={() => router.navigate("/groups")}
              >
                <Ionicons name="chevron-back" size={22} color={colors.foreground} accessible={false} />
              </Button>
              <Text accessibilityRole="header" className="flex-1 text-2xl font-semibold">
                Deleted groups
              </Text>
            </View>
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
