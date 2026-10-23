import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ContentState, QueryErrorState } from "@/components/ui/content-state";
import { useGetExpenseQuery } from "../expensesApi";
import CreateExpenseScreen from "./CreateExpenseScreen";

export default function EditExpenseScreen({ groupId, expenseId }: { groupId: string; expenseId: string }) {
  const { currentData, isFetching, isError, error, refetch } = useGetExpenseQuery(expenseId, { refetchOnMountOrArgChange: true });
  const expense = currentData?.data.expense;

  if(expense?.billId && expense.groupId===groupId && !isError) return <SafeAreaView className="flex-1 bg-background"><View className="gap-4 p-5"><Text className="text-xl font-semibold">Paid bill expense</Text><Text>This expense is linked to a paid bill and cannot be edited independently.</Text><Button onPress={()=>router.navigate({pathname:"/groups/[groupId]/bills/[billId]",params:{groupId,billId:expense.billId!}})}><Text>View linked bill</Text></Button></View></SafeAreaView>;
  if (expense && expense.groupId === groupId && !isError) {
    return <CreateExpenseScreen key={expenseId} groupId={groupId} expense={expense} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="gap-4 p-5">
        <Text className="text-3xl font-semibold">Edit expense</Text>
        {isFetching ? <ActivityIndicator accessibilityLabel="Loading expense" /> : (
          isError ? <QueryErrorState error={error} subject="Expense" onRetry={() => void refetch()} /> : <ContentState icon="lock-closed-outline" title="Expense unavailable" description="This expense does not belong to the selected group." />
        )}
        <Button variant="ghost" onPress={() => router.navigate({ pathname: "/groups/[groupId]/expenses", params: { groupId } })}><Text>Back to expenses</Text></Button>
      </View>
    </SafeAreaView>
  );
}
