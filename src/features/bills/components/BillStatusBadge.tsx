import { Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeProvider";
import type { BillStatus } from "../types";

const statusLabels: Record<BillStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

export default function BillStatusBadge({ status }: { status: BillStatus }) {
  const { statusColors } = useTheme();
  const palette = statusColors[status];

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 4,
        backgroundColor: palette.background,
      }}
    >
      <Text
        style={{ color: palette.foreground, fontSize: 12, fontWeight: "600" }}
      >
        {statusLabels[status]}
      </Text>
    </View>
  );
}
