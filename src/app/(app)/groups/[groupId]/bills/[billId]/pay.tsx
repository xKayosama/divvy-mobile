import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import PayBillScreen from "@/features/bills/screens/PayBillScreen";

export default function PayBillRoute() {
  const { groupId, billId } = useLocalSearchParams<{
    groupId: string;
    billId: string;
  }>();
  if (!groupId || !billId) return <Text>No bill selected.</Text>;
  return (
    <PayBillScreen
      key={`${groupId}:${billId}`}
      groupId={groupId}
      billId={billId}
    />
  );
}
