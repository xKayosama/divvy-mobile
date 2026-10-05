import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Divvy</Text>
      <Text style={styles.subtitle}>Split expenses. Keep it simple.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  title: {
    fontSize: 40,
    fontWeight: "700",
    color: colors.primary,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: colors.mutedForeground,
  },
});
