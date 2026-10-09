import { Text } from "@/components/ui/text";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ScreenPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-background"
    >
      <View className="gap-2 p-5">
        <Text className="text-3xl font-semibold tracking-tight">
          {title}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {description}
        </Text>
      </View>
    </SafeAreaView>
  );
}