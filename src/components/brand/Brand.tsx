import { Image } from "expo-image";
import { View } from "react-native";

export function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <Image
      source={require("@/assets/images/divvy-icon.png")}
      contentFit="contain"
      accessibilityLabel="Divvy"
      accessible
      style={{ width: size, height: size }}
    />
  );
}

export function Brand() {
  return (
    <View
      accessible
      accessibilityLabel="Divvy"
      style={{ width: 152, height: 52, overflow: "hidden" }}
    >
      {/* The supplied wordmark includes transparent padding around the artwork. */}
      <Image
        source={require("@/assets/images/divvy-logo.png")}
        contentFit="contain"
        accessible={false}
        style={{
          width: 240,
          height: 80,
          position: "absolute",
          left: -44,
          top: -16,
        }}
      />
    </View>
  );
}
