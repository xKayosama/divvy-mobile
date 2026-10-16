import { expenseFiltersFromParams } from "@/features/expenses/filters";
import ExpensesScreen from "@/features/expenses/screens/ExpensesScreen";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

export default function ExpensesRoute() {
  const { groupId, category, startDate, endDate, filterRequest } = useLocalSearchParams<{
    groupId: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    filterRequest?: string;
  }>();
  const initialFilters = expenseFiltersFromParams({ category, startDate, endDate });

  if (!groupId) return <Text>No group selected.</Text>;

  return <ExpensesScreen key={`${groupId}:${JSON.stringify(initialFilters)}:${filterRequest ?? ""}`} groupId={groupId} initialFilters={initialFilters} />;
}