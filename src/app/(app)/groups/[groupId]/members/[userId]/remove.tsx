import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import ManageGroupScreen from "@/features/groups/screens/ManageGroupScreen";

export default function RemoveMemberRoute() {
  const { groupId, userId } = useLocalSearchParams<{
    groupId: string;
    userId: string;
  }>();
  if (!groupId || !userId) return <Text>No member selected.</Text>;
  return (
    <ManageGroupScreen
      key={`${groupId}:${userId}`}
      groupId={groupId}
      memberUserId={userId}
    />
  );
}
