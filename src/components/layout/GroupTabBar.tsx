import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Tabs } from "expo-router";
import { Fragment, useEffect, useState, type ComponentProps } from "react";
import { Keyboard, Platform, Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { groupTabBar, tabBarBottomPadding } from "@/constants/navigation";
import { useTheme } from "@/theme/ThemeProvider";

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const tabs = [
  { name: "home", label: "Home", icon: "home-outline", active: "home" },
  { name: "expenses", label: "Expenses", icon: "receipt-outline", active: "receipt" },
  { name: "bills", label: "Upcoming bills", icon: "calendar-outline", active: "calendar" },
  { name: "group", label: "Group", icon: "people-outline", active: "people" },
] as const;

export default function GroupTabBar({ state, navigation, descriptors, groupId }: BottomTabBarProps & { groupId: string }) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible) return null;

  const height = groupTabBar.height + tabBarBottomPadding(insets.bottom);
  const center = width / 2;
  const path = `M 0 26 Q 0 0 26 0 H ${center - 62} C ${center - 42} 0 ${center - 44} 42 ${center} 42 C ${center + 44} 42 ${center + 42} 0 ${center + 62} 0 H ${width - 26} Q ${width} 0 ${width} 26 V ${height} H 0 Z`;
  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: height + groupTabBar.raise, paddingTop: groupTabBar.raise }}
      pointerEvents="box-none"
    >
      {width > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: groupTabBar.raise,
            shadowColor: mode === "dark" ? "#000000" : "#123D33",
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: mode === "dark" ? 0.28 : 0.12,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Svg width={width} height={height}>
            <Path d={path} fill={colors.card} stroke={colors.border} strokeWidth={1} />
          </Svg>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", paddingLeft: insets.left + 6, paddingRight: insets.right + 6, height: groupTabBar.height }}>
        {tabs.map((tab, index) => {
          const route = state.routes.find((item) => item.name === tab.name);
          if (!route) return null;
          const focused = state.routes[state.index].key === route.key;
          const color = focused ? colors.primary : colors.mutedForeground;
          return (
            <Fragment key={tab.name}>
              {index === 2 ? <View style={{ width: 80 }} /> : null}
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel ?? tab.label}
                onPress={() => {
                  const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                }}
                onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
                className="active:opacity-60"
                style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingTop: 4 }}
              >
                <Ionicons name={focused ? tab.active : tab.icon} size={23} color={color} accessible={false} />
                <Text numberOfLines={tab.name==="bills"?2:1} style={{ color, fontSize: 11, lineHeight:12, textAlign:"center", fontWeight: focused ? "700" : "500" }}>{tab.name==="bills"?"Upcoming\nbills":tab.label}</Text>
                <View style={{ height: 3, width: 28, borderRadius: 2, backgroundColor: focused ? colors.primary : "transparent" }} />
              </Pressable>
            </Fragment>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan receipt"
        onPress={() => router.push({ pathname: "/groups/[groupId]/expenses/scan", params: { groupId } })}
        className="active:opacity-80"
        style={{ position: "absolute", top: 0, left: center - 32, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", boxShadow: mode === "dark" ? "0 5px 16px rgba(0,0,0,0.36)" : "0 5px 16px rgba(8,127,101,0.26)" }}
      >
        <Ionicons name="scan-outline" size={30} color={colors.primaryForeground} accessible={false} />
      </Pressable>
    </View>
  );
}
