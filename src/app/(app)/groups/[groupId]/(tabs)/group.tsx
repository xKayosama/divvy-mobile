import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import GroupScreen from "@/features/groups/screens/GroupScreen";

export default function GroupRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  if (!groupId) return <Text>No group selected.</Text>;
  return <GroupScreen key={groupId} groupId={groupId} />;
}
