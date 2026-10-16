import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";

type Props = {
  pendingAmount: string;
  pendingCount: number;
  overdueAmount: string;
  overdueCount: number;
  onOpenPending: () => void;
  onOpenOverdue: () => void;
};

export default function BillSummaryCards({
  pendingAmount,
  pendingCount,
  overdueAmount,
  overdueCount,
  onOpenPending,
  onOpenOverdue,
}: Props) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      <BillCard
        title="Pending bills"
        amount={pendingAmount}
        count={pendingCount}
        overdue={false}
        onPress={onOpenPending}
      />
      <BillCard
        title="Overdue bills"
        amount={overdueAmount}
        count={overdueCount}
        overdue
        onPress={onOpenOverdue}
      />
    </View>
  );
}

function BillCard({
  title,
  amount,
  count,
  overdue,
  onPress,
}: {
  title: string;
  amount: string;
  count: number;
  overdue: boolean;
  onPress?: () => void;
}) {
  const { colors, statusColors, surfaces } = useTheme();
  const palette = statusColors[overdue ? "OVERDUE" : "PENDING"];
  const active = count > 0;
  const accent = active ? palette.foreground : colors.mutedForeground;

  const Container = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `View ${overdue ? "overdue" : "pending"} bills, ${count} ${count === 1 ? "bill" : "bills"}` : undefined}
      className={onPress ? "active:opacity-70" : undefined}
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
        {onPress ? <Ionicons name="arrow-forward" size={18} color={colors.primary} accessible={false} /> : null}
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
    </Container>
  );
}
