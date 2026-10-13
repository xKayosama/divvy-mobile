import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";

function supportsGlass() {
  try {
    return Platform.OS === "ios" && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    // Older development builds may not include the native module yet.
    return false;
  }
}

const nativeGlass = supportsGlass();
const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 26 } as const;

export default function TabBarBackground() {
  const { glass, mode } = useTheme();
  const gradient = glass.gradient;
  if (nativeGlass) {
    return <GlassView pointerEvents="none" style={fill} glassEffectStyle="regular" colorScheme={mode} />;
  }

  return (
    <View
      pointerEvents="none"
      style={{
        ...fill,
        backgroundColor: glass.background,
        borderWidth: 1,
        borderColor: glass.border,
        ...Platform.select({
          web: { backgroundImage: gradient },
          default: { experimental_backgroundImage: gradient },
        }),
      }}
    />
  );
}
