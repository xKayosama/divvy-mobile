import BillsScreen from "@/features/bills/screens/BillsScreen";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

export default function BillsRoute() {
  const { groupId, status, filterRequest } = useLocalSearchParams<{
    groupId: string;
    status?: string;
    filterRequest?: string;
  }>();
  const initialStatus = status === "PENDING" || status === "PAID" || status === "OVERDUE" ? status : undefined;

  if (!groupId) return <Text>No group selected.</Text>;

  return <BillsScreen key={`${groupId}:${initialStatus ?? "all"}:${filterRequest ?? ""}`} groupId={groupId} initialStatus={initialStatus} />;
}

