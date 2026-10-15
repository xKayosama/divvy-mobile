import { Text } from "@/components/ui/text";
import { ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { tabContentBottomInset } from "@/constants/navigation";
import ScreenBackground from "./ScreenBackground";

export default function ScreenPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-background"
    >
      <ScreenBackground />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 8, paddingBottom: tabContentBottomInset(insets.bottom) }}>
        <Text className="text-3xl font-semibold tracking-tight">
          {title}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {description}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
