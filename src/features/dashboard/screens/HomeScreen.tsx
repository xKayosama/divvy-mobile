import { useCallback } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  AppState,
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
import BillReminders from "../components/BillReminders";
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

  const { currentData: data, isLoading, isFetching, isError, refetch } =
    useGetGroupDashboardQuery(groupId, { skip: !groupId });

  useFocusEffect(useCallback(() => {
    if (!groupId) return;
    void refetch();
    let timer: ReturnType<typeof setTimeout>;
    function scheduleMidnight() {
      const next = new Date();
      next.setUTCHours(24, 0, 0, 0);
      timer = setTimeout(() => {
        void refetch();
        scheduleMidnight();
      }, next.getTime() - Date.now() + 1000);
    }
    scheduleMidnight();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") {
        void refetch();
        clearTimeout(timer);
        scheduleMidnight();
      }
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [groupId, refetch]));

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
            onOpenProfile={() => {
              if (groupId) router.navigate({ pathname: "/groups/[groupId]/profile", params: { groupId } });
              else router.push("/profile");
            }}
          />

          {!groupId ? (
            <Text>No group selected. Return to your groups.</Text>
          ) : isLoading || (!data && isFetching) ? (
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
                onOpenPending={() => router.navigate({
                  pathname: "/groups/[groupId]/bills",
                  params: { groupId, status: "PENDING", filterRequest: String(Date.now()) },
                })}
                overdueAmount={formatAmount(data.data.bills.overdueAmount)}
                overdueCount={data.data.bills.overdue}
                onOpenOverdue={() => router.navigate({
                  pathname: "/groups/[groupId]/bills",
                  params: { groupId, status: "OVERDUE", filterRequest: String(Date.now()) },
                })}
              />

              <Text className="text-sm text-muted-foreground">
                Paid bills: {data.data.bills.paid} ·{" "}
                {formatAmount(data.data.bills.paidAmount)}
              </Text>

              {data.data.billReminders ? (
                <BillReminders
                  key={groupId}
                  reminders={data.data.billReminders}
                  currency={group?.currency}
                  formatAmount={formatAmount}
                  onOpenBill={(billId) => router.push({ pathname: "/groups/[groupId]/bills/[billId]/pay", params: { groupId, billId } })}
                  onViewBills={() => router.navigate({ pathname: "/groups/[groupId]/bills", params: { groupId } })}
                />
              ) : null}

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

              {!data.data.billReminders ? (
                <UpcomingBills
                  bills={data.data.upcomingBills}
                  formatAmount={formatAmount}
                />
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
