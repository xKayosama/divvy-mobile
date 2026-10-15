import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import EditExpenseScreen from "@/features/expenses/screens/EditExpenseScreen";

export default function EditExpenseRoute() {
  const { groupId, expenseId } = useLocalSearchParams<{ groupId: string; expenseId: string }>();
  if (!groupId || !expenseId) return <Text>No expense selected.</Text>;
  return <EditExpenseScreen key={`${groupId}:${expenseId}`} groupId={groupId} expenseId={expenseId} />;
}
