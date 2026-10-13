import { useTheme } from "@/theme/ThemeProvider";
import TabIcon from "@/components/layout/TabIcon";
import TabBarBackground from "@/components/layout/TabBarBackground";
import { Tabs, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { floatingTabBar, tabBarBottomOffset } from "@/constants/navigation";

export default function GroupTabsLayout() {
  const { colors } = useTheme();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="home"
      safeAreaInsets={{ bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          marginHorizontal: 2,
          borderRadius: 16,
        },
        tabBarStyle: {
          position: "absolute",
          marginLeft: floatingTabBar.margin + insets.left,
          marginRight: floatingTabBar.margin + insets.right,
          bottom: tabBarBottomOffset(insets.bottom),
          height: floatingTabBar.height,
          backgroundColor: "transparent",
          paddingHorizontal: 8,
          paddingTop: 6,
          paddingBottom: 6,
          borderRadius: 26,
          borderWidth: 0,
          borderTopWidth: 0,
          boxShadow: "0 6px 24px rgba(18,61,51,0.12)",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        initialParams={{ groupId }}
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              focused={focused}
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="expenses"
        initialParams={{ groupId }}
        options={{
          title: "Expenses",
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              focused={focused}
              name={focused ? "receipt" : "receipt-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="bills"
        initialParams={{ groupId }}
        options={{
          title: "Bills",
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              focused={focused}
              name={focused ? "calendar" : "calendar-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="group"
        initialParams={{ groupId }}
        options={{
          title: "Group",
          tabBarIcon: ({ focused, color, size }) => (
            <TabIcon
              focused={focused}
              name={focused ? "people" : "people-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
