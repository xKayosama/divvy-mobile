import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import ExpenseDetailsScreen from "@/features/expenses/screens/ExpenseDetailsScreen";

export default function ExpenseDetailsRoute() {
  const { groupId, expenseId } = useLocalSearchParams<{ groupId: string; expenseId: string }>();
  if (!groupId || !expenseId) return <Text>No expense selected.</Text>;
  return <ExpenseDetailsScreen key={`${groupId}:${expenseId}`} groupId={groupId} expenseId={expenseId} />;
}
