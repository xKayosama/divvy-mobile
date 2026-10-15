import Ionicons from "@expo/vector-icons/Ionicons";
import { View, type ColorValue } from "react-native";

type Props = {
  name: React.ComponentProps<typeof Ionicons>["name"];
  focused: boolean;
  color: ColorValue;
  size: number;
};

export default function TabIcon({ name, color, size }: Props) {
  return (
    <View
      style={{
        width: 48,
        height: 32,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} color={color} size={Math.min(size, 24)} accessible={false} />
    </View>
  );
}
