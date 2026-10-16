import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform, View } from "react-native";

import type { SpendingComparison } from "../types";
import { spendingComparisonText } from "../spendingComparison";

type Props = { amount: string; currency?: string; periodLabel?: string; dateRange?: string; comparison?: SpendingComparison | null };

export default function SpendingCard({ amount, currency, periodLabel = "All time", dateRange, comparison }: Props) {
  const comparisonText = spendingComparisonText(comparison, currency);
  const { brandGradients } = useTheme();
  const gradient = `linear-gradient(125deg, ${brandGradients.spending.join(", ")})`;

  return (
    <View
      style={{
        borderRadius: 24,
        padding: 22,
        overflow: "hidden",
        backgroundColor: "#15533F",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
        ...Platform.select({
          web: { backgroundImage: gradient },
          default: { experimental_backgroundImage: gradient },
        }),
      }}
    >
      <View
        pointerEvents="none"
        accessible={false}
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: 110,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          right: -100,
          top: -80,
        }}
      />
      <View
        pointerEvents="none"
        accessible={false}
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: 80,
          backgroundColor: "rgba(255,255,255,0.03)",
          right: -70,
          top: -50,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            backgroundColor: "rgba(255,255,255,0.12)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="wallet-outline"
            size={18}
            color="#B6F3DB"
            accessible={false}
          />
        </View>
        <Text
          style={{ color: "#D3EDE2", fontSize: 13, fontWeight: "500", flex: 1 }}
        >
          Total shared spending
        </Text>
        <View
          style={{
            borderRadius: 8,
            paddingHorizontal: 9,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.16)",
          }}
        >
          <Text
            style={{
              color: "#D3EDE2",
              fontSize: 10,
              fontWeight: "600",
              letterSpacing: 0.8,
            }}
          >
            {periodLabel.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={{ paddingTop: 24, paddingBottom: 22, gap: 5 }}>
        {currency ? (
          <Text
            style={{
              color: "#B6F3DB",
              fontSize: 12,
              fontWeight: "600",
              letterSpacing: 1.5,
            }}
          >
            {currency}
          </Text>
        ) : null}
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          numberOfLines={1}
          style={{
            color: "#FFFFFF",
            fontSize: 42,
            lineHeight: 50,
            fontWeight: "700",
            letterSpacing: -1.5,
            fontVariant: ["tabular-nums"],
          }}
        >
          {amount}
        </Text>
      </View>
      {comparisonText ? (
        <View style={{ gap: 6, paddingBottom: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 7 }}>
            <Ionicons
              name={comparison?.direction === "increase" ? "trending-up-outline" : comparison?.direction === "decrease" ? "trending-down-outline" : "remove-outline"}
              size={18}
              color="#B6F3DB"
              accessible={false}
            />
            <Text style={{ flex: 1, color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>{comparisonText.headline}</Text>
          </View>
          <Text style={{ color: "#D3EDE2", fontSize: 12 }}>{comparisonText.detail}</Text>
          <Text style={{ color: "#B6F3DB", fontSize: 11 }}>{comparisonText.context}</Text>
        </View>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 7,
          borderTopWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          paddingTop: 14,
        }}
      >
        <Ionicons
          name="people-outline"
          size={14}
          color="#B6F3DB"
          accessible={false}
        />
        <Text style={{ color: "#D3EDE2", fontSize: 12, flex: 1 }}>
          {dateRange ?? "Recorded expenses across your group"}
        </Text>
      </View>
    </View>
  );
}
