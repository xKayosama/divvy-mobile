import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import EditBillScreen from "@/features/bills/screens/EditBillScreen";

export default function EditBillRoute() {
  const { groupId, billId } = useLocalSearchParams<{
    groupId: string;
    billId: string;
  }>();
  if (!groupId || !billId) return <Text>No bill selected.</Text>;
  return (
    <EditBillScreen
      key={`${groupId}:${billId}`}
      groupId={groupId}
      billId={billId}
    />
  );
}
