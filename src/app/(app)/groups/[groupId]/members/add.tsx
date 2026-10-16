import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import AddMemberScreen from "@/features/groups/screens/AddMemberScreen";

export default function AddMemberRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  if (!groupId) return <Text>No group selected.</Text>;
  return <AddMemberScreen key={groupId} groupId={groupId} />;
}
