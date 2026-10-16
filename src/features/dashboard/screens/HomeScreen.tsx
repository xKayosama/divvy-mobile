import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { tabContentBottomInset } from "@/constants/navigation";

import { Button } from "@/components/ui/button";
import ScreenBackground from "@/components/layout/ScreenBackground";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import { useGetMyGroupsQuery } from "@/features/groups/groupsApi";
import BillSummaryCards from "../components/BillSummaryCards";
import DashboardHeader from "../components/DashboardHeader";
import MemberBalances from "../components/MemberBalances";
import SpendingCard from "../components/SpendingCard";
import UpcomingBills from "../components/UpcomingBills";
import { useGetGroupDashboardQuery } from "../dashboardApi";

export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { data: groupsData } = useGetMyGroupsQuery();

  const group = groupsData?.data.groups.find((item) => item.id === groupId);

  const { data, isLoading, isFetching, isError, refetch } =
    useGetGroupDashboardQuery(groupId, { skip: !groupId });

  function formatAmount(amount: number) {
    return new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-background"
    >
      <ScreenBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: tabContentBottomInset(insets.bottom) }}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: tabContentBottomInset(insets.bottom),
          flexGrow: 1,
        }}
        refreshControl={
          groupId ? (
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => {
                if (!isFetching) void refetch();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
      >
        <View className="gap-6">
          <DashboardHeader
            groupName={group?.name ?? "Your group"}
            currency={group?.currency}
            onSwitchGroup={() => router.replace("/groups")}
          />

          {!groupId ? (
            <Text>No group selected. Return to your groups.</Text>
          ) : isLoading ? (
            <View className="items-center gap-3 py-10">
              <ActivityIndicator />
              <Text>Loading dashboard…</Text>
            </View>
          ) : isError ? (
            <View className="gap-3">
              <Text>Unable to load the dashboard.</Text>

              <Button disabled={isFetching} onPress={() => void refetch()}>
                <Text>{isFetching ? "Retrying…" : "Retry"}</Text>
              </Button>
            </View>
          ) : data ? (
            <>
              <SpendingCard
                amount={formatAmount(data.data.summary.totalExpenses)}
                currency={group?.currency}
              />

              <BillSummaryCards
                pendingAmount={formatAmount(data.data.bills.pendingAmount)}
                pendingCount={data.data.bills.pending}
                overdueAmount={formatAmount(data.data.bills.overdueAmount)}
                overdueCount={data.data.bills.overdue}
              />

              <Text className="text-sm text-muted-foreground">
                Paid bills: {data.data.bills.paid} ·{" "}
                {formatAmount(data.data.bills.paidAmount)}
              </Text>

              <MemberBalances
                onSettleUp={() =>
                  router.push({
                    pathname: "/groups/[groupId]/settlements",
                    params: { groupId },
                  })
                }
                balances={data.data.balances}
                formatAmount={formatAmount}
              />

              <UpcomingBills
                bills={data.data.upcomingBills}
                formatAmount={formatAmount}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
