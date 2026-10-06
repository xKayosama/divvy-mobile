import type { PropsWithChildren } from "react";
import { Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "@/components/brand/Brand";
import { Text } from "@/components/ui/text";

export function AuthScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Native keyboard insets animate with iOS without resizing/recentering the form.
          Android's default resize mode supplies the smaller scroll viewport. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: Platform.OS === "web" ? "center" : "flex-start",
          paddingHorizontal: 24,
          paddingVertical: 32,
        }}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 440, alignSelf: "center" }}>
          <View className="mb-10">
            <Brand />
          </View>
          {children}
          <Text className="mt-8 text-center text-sm text-muted-foreground">
            Shared expenses. A little less complicated.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function AuthHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-7 gap-3">
      <Text
        accessibilityRole="header"
        className="text-4xl font-bold tracking-tight leading-[44px]"
      >
        {title}
      </Text>
      <Text className="text-base leading-6 text-muted-foreground">
        {subtitle}
      </Text>
    </View>
  );
}
