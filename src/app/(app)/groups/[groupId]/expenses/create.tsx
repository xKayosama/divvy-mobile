import { Text } from "@/components/ui/text";
import CreateExpenseScreen from "@/features/expenses/screens/CreateExpenseScreen";
import { useLocalSearchParams } from "expo-router";

export default function CreateExpenseRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  if (!groupId) return <Text>No group selected.</Text>;

  return <CreateExpenseScreen key={groupId} groupId={groupId} />;
}