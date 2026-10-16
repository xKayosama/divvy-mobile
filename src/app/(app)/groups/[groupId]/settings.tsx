import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import ManageGroupScreen from "@/features/groups/screens/ManageGroupScreen";

export default function GroupSettingsRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  if (!groupId) return <Text>No group selected.</Text>;
  return <ManageGroupScreen key={groupId} groupId={groupId} />;
}
