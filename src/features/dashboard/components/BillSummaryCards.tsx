import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  pendingAmount: string;
  pendingCount: number;
  overdueAmount: string;
  overdueCount: number;
};

export default function BillSummaryCards({
  pendingAmount,
  pendingCount,
  overdueAmount,
  overdueCount,
}: Props) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      <BillCard
        title="Pending bills"
        amount={pendingAmount}
        count={pendingCount}
        overdue={false}
      />
      <BillCard
        title="Overdue bills"
        amount={overdueAmount}
        count={overdueCount}
        overdue
      />
    </View>
  );
}

function BillCard({
  title,
  amount,
  count,
  overdue,
}: {
  title: string;
  amount: string;
  count: number;
  overdue: boolean;
}) {
  const { colors, statusColors, surfaces } = useTheme();
  const palette = statusColors[overdue ? "OVERDUE" : "PENDING"];
  const active = count > 0;
  const accent = active ? palette.foreground : colors.mutedForeground;

  return (
    <View
      style={{
        ...surfaces.card,
        flexGrow: 1,
        flexBasis: 140,
        borderRadius: 20,
        padding: 16,
        gap: 16,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons
          name={
            overdue
              ? active
                ? "alert-circle-outline"
                : "checkmark-circle-outline"
              : "calendar-outline"
          }
          size={18}
          color={accent}
          accessible={false}
        />
        <Text
          style={{
            color: colors.mutedForeground,
            fontSize: 12,
            fontWeight: "500",
            flex: 1,
          }}
        >
          {title}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={{
          color: colors.foreground,
          fontSize: 26,
          lineHeight: 34,
          fontWeight: "600",
          letterSpacing: -0.8,
          fontVariant: ["tabular-nums"],
        }}
      >
        {amount}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: accent,
          }}
        />
        <Text style={{ color: accent, fontSize: 11, flex: 1 }}>
          {active
            ? `${count} ${count === 1 ? "bill" : "bills"} ${overdue ? "overdue" : "to pay"}`
            : overdue
              ? "All caught up"
              : "Nothing due"}
        </Text>
      </View>
    </View>
  );
}
