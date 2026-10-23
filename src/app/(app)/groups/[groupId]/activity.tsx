import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import ActivityScreen from "@/features/activity/screens/ActivityScreen";
export default function ActivityRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  if (!groupId) return <Text>No group selected.</Text>;
  return <ActivityScreen key={groupId} groupId={groupId} />;
}
