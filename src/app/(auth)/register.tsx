import { Link } from "expo-router";
import { View } from "react-native";

import { Text } from "@/components/ui/text";

export default function RegisterScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <Text className="text-3xl font-bold text-primary">
        Create account
      </Text>

      <Link href="/login" className="mt-6">
        <Text className="font-semibold text-primary">
          Back to sign in
        </Text>
      </Link>
    </View>
  );
}