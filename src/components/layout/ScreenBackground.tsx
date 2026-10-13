import { Platform, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";


/** A shared, non-interactive backdrop for the main app screens. */
export default function ScreenBackground() {
  const { colors, brandGradients } = useTheme();
  const gradient = `linear-gradient(150deg, ${brandGradients.screen.join(", ")})`;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: colors.background,
          ...Platform.select({
            web: { backgroundImage: gradient },
            default: { experimental_backgroundImage: gradient },
          }),
      }}
    />
  );
}
