import BillsScreen from "@/features/bills/screens/BillsScreen";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

export default function BillsRoute() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  if (!groupId) return <Text>No group selected.</Text>;

  return <BillsScreen key={groupId} groupId={groupId} />;
}

