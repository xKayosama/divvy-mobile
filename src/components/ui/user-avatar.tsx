import { Image } from "expo-image";
import { useState } from "react";
import { View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./text";

type Props = {
  firstName?: string;
  lastName?: string;
  imageUrl?: string | null;
  size?: number;
};

export function UserAvatar({ firstName, lastName, imageUrl, size = 48 }: Props) {
  const { colors } = useTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = [firstName, lastName]
    .map((name) => Array.from(name?.trim() ?? "")[0] ?? "")
    .join("")
    .toUpperCase() || "?";
  const uri = imageUrl?.trim();

  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.secondary,
      }}
    >
      {uri && uri !== failedUrl ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          style={{ width: size, height: size }}
          onError={() => setFailedUrl(uri)}
          accessible={false}
        />
      ) : (
        <Text style={{ color: colors.primary, fontSize: size * 0.32, fontWeight: "600" }}>
          {initials}
        </Text>
      )}
    </View>
  );
}
