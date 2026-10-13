import Ionicons from "@expo/vector-icons/Ionicons";
import { View, type ColorValue } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  name: React.ComponentProps<typeof Ionicons>["name"];
  focused: boolean;
  color: ColorValue;
  size: number;
};

export default function TabIcon({ name, focused, color, size }: Props) {
  const { glass } = useTheme();
  return (
    <View
      style={{
        width: 44,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? glass.active : "transparent",
        borderWidth: 1,
        borderColor: focused ? glass.activeBorder : "transparent",
        boxShadow: focused ? "0 2px 6px rgba(8,127,101,0.08)" : undefined,
      }}
    >
      <Ionicons name={name} color={color} size={Math.min(size, 22)} accessible={false} />
    </View>
  );
}
