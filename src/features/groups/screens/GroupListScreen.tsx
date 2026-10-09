import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetMyGroupsQuery } from "../groupsApi";

export default function GroupListScreen() {
  const { data, isLoading, isError, refetch } = useGetMyGroupsQuery();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
        <Text className="mt-3">Loading your groups…</Text>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text>Unable to load your groups.</Text>
        <Button onPress={() => void refetch()}>
          <Text>Retry</Text>
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={data?.data.groups ?? []}
        keyExtractor={(group) => group.id}
        contentContainerStyle={{ padding: 24, flexGrow: 1 }}
        ListHeaderComponent={
        <View className="mb-6 gap-4">
          <Text className="text-2xl font-semibold">
            Your groups
          </Text>

          <Button onPress={() => router.push("/groups/create")}>
            <Text>Create group</Text>
          </Button>
         </View>
        }
        ListEmptyComponent={
          <Text>You haven’t joined or created a group yet.</Text>
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`Open ${item.name}`}
    className="rounded-xl border border-border bg-card p-4"
    onPress={() =>
      router.push({
        pathname: "/groups/[groupId]/home",
        params: { groupId: item.id },
      })
    }
  >
    <Text className="text-lg font-semibold">{item.name}</Text>
    <Text className="mt-1 text-muted-foreground">
      {item.currency} · {item.role}
    </Text>
  </Pressable>
)}
      />
    </SafeAreaView>
  );
}