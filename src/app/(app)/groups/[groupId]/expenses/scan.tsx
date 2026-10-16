import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import ScanReceiptScreen from "@/features/receipts/screens/ScanReceiptScreen";
export default function ScanReceiptRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  if (!groupId) return <Text>No group selected.</Text>;
  return <ScanReceiptScreen key={groupId} groupId={groupId} />;
}
