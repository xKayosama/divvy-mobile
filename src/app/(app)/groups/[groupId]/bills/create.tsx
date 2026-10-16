import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import CreateBillScreen from "@/features/bills/screens/CreateBillScreen";

export default function CreateBillRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  if (!groupId) return <Text>No group selected.</Text>;
  return <CreateBillScreen key={groupId} groupId={groupId} />;
}
