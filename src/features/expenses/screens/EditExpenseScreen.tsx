import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { authError } from "@/features/auth/errors";
import { useGetExpenseQuery } from "../expensesApi";
import CreateExpenseScreen from "./CreateExpenseScreen";

export default function EditExpenseScreen({ groupId, expenseId }: { groupId: string; expenseId: string }) {
  const { currentData, isFetching, isError, error, refetch } = useGetExpenseQuery(expenseId, { refetchOnMountOrArgChange: true });
  const expense = currentData?.data.expense;

  if (expense && expense.groupId === groupId && !isError) {
    return <CreateExpenseScreen key={expenseId} groupId={groupId} expense={expense} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="gap-4 p-5">
        <Text className="text-3xl font-semibold">Edit expense</Text>
        {isFetching ? <ActivityIndicator accessibilityLabel="Loading expense" /> : (
          <>
            <Text accessibilityLiveRegion="polite">{isError ? authError(error, "Unable to load this expense.") : "This expense does not belong to this group."}</Text>
            <Button onPress={() => void refetch()}><Text>Retry</Text></Button>
          </>
        )}
        <Button variant="ghost" onPress={() => router.navigate({ pathname: "/groups/[groupId]/expenses", params: { groupId } })}><Text>Back to expenses</Text></Button>
      </View>
    </SafeAreaView>
  );
}
