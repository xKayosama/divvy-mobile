import { Image } from "expo-image";
import { View } from "react-native";

export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/images/divvy-icon-green.png")}
      contentFit="contain"
      accessibilityLabel="Divvy"
      accessible
      style={{ width: size, height: size }}
    />
  );
}

export function Brand({ width = 152 }: { width?: number }) {
  const scale = width / 152;
  return (
    <View
      accessible
      accessibilityLabel="Divvy"
      style={{ width, height: 52 * scale, flexShrink: 0 }}
    >
      {/* The supplied wordmark includes transparent padding around the artwork. */}
      <Image
        source={require("@/assets/images/divvy-word-green.png")}
        contentFit="contain"
        accessible={false}
        style={{
          width: 210 * scale,
          height: 70 * scale,
          position: "absolute",
          left: -30 * scale,
          top: -6 * scale,
        }}
      />
    </View>
  );
}
