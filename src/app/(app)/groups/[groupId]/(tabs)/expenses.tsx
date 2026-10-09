import ExpensesScreen from "@/features/expenses/screens/ExpensesScreen";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

export default function ExpensesRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  if (!groupId) return <Text>No group selected.</Text>;

  return <ExpensesScreen key={groupId} groupId={groupId} />;
}