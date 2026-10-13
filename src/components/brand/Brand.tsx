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

export function Brand() {
  return (
    <View
      accessible
      accessibilityLabel="Divvy"
      style={{ width: 152, height: 52 }}
    >
      {/* The supplied wordmark includes transparent padding around the artwork. */}
      <Image
        source={require("@/assets/images/divvy-word-green.png")}
        contentFit="contain"
        accessible={false}
        style={{
          width: 210,
          height: 70,
          position: "absolute",
          left: -30,
          top: -6,
        }}
      />
    </View>
  );
}
