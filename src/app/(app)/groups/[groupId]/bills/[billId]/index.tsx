import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import BillDetailsScreen from "@/features/bills/screens/BillDetailsScreen";

export default function BillDetailsRoute() {
  const { groupId, billId } = useLocalSearchParams<{ groupId: string; billId: string }>();
  if (!groupId || !billId) return <Text>No bill selected.</Text>;
  return <BillDetailsScreen key={`${groupId}:${billId}`} groupId={groupId} billId={billId} />;
}
