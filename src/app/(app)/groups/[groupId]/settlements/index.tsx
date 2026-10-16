import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import SettlementsScreen from "@/features/settlements/screens/SettlementsScreen";
export default function SettlementsRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  if (!groupId) return <Text>No group selected.</Text>;
  return <SettlementsScreen key={groupId} groupId={groupId} />;
}
