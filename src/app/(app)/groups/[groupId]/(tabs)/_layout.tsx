import GroupTabBar from "@/components/layout/GroupTabBar";
import { Tabs, useLocalSearchParams } from "expo-router";

export default function GroupTabsLayout() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => <GroupTabBar {...props} groupId={groupId} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" initialParams={{ groupId }} options={{ title: "Home" }} />
      <Tabs.Screen name="expenses" initialParams={{ groupId }} options={{ title: "Expenses" }} />
      <Tabs.Screen name="bills" initialParams={{ groupId }} options={{ title: "Upcoming bills" }} />
      <Tabs.Screen name="group" initialParams={{ groupId }} options={{ title: "Group" }} />
      <Tabs.Screen name="profile" initialParams={{ groupId }} options={{ href: null, title: "Profile" }} />
    </Tabs>
  );
}
