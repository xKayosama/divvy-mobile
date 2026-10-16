import { useLocalSearchParams } from "expo-router";
import { Text } from "@/components/ui/text";
import RecordPaymentScreen from "@/features/settlements/screens/RecordPaymentScreen";
export default function RecordPaymentRoute() {
  const { groupId, to, amount } = useLocalSearchParams<{
    groupId: string;
    to?: string;
    amount?: string;
  }>();
  if (!groupId) return <Text>No group selected.</Text>;
  return (
    <RecordPaymentScreen
      key={`${groupId}:${to ?? ""}:${amount ?? ""}`}
      groupId={groupId}
      initialTo={to}
      initialAmount={amount}
    />
  );
}
