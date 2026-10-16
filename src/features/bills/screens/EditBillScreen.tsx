import { router } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ContentState, QueryErrorState } from "@/components/ui/content-state";
import { useGetBillQuery } from "../billsApi";
import CreateBillScreen from "./CreateBillScreen";

export default function EditBillScreen({
  groupId,
  billId,
}: {
  groupId: string;
  billId: string;
}) {
  const { currentData, isFetching, isError, error, refetch } = useGetBillQuery(
    billId,
    { refetchOnMountOrArgChange: true },
  );
  const bill = currentData?.data.bill;
  if (bill && bill.groupId === groupId && bill.status !== "PAID" && !isError) {
    return <CreateBillScreen key={billId} groupId={groupId} bill={bill} />;
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="gap-4 p-5">
        <Text className="text-3xl font-semibold">Edit bill</Text>
        {isFetching ? (
          <ActivityIndicator accessibilityLabel="Loading bill" />
        ) : (
          isError ? <QueryErrorState error={error} subject="Bill" onRetry={() => void refetch()} /> : <ContentState icon="lock-closed-outline" title={bill?.groupId === groupId ? "Paid bill locked" : "Bill unavailable"} description={bill?.groupId === groupId ? "Paid bills cannot be edited or deleted." : "This bill does not belong to the selected group."} />
        )}
        <Button
          variant="ghost"
          onPress={() =>
            router.navigate({
              pathname: "/groups/[groupId]/bills",
              params: { groupId },
            })
          }
        >
          <Text>Back to bills</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
