import { CategorySelector } from "@/components/ui/category-selector";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, ScrollView, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";
import { billCategoryOptions } from "../billForm";
import type { GetBillsRequest } from "../types";

export type BillFilters = Pick<GetBillsRequest, "category" | "status" | "isRecurring">;

export default function BillFiltersModal({ filters, onApply, onClose, view = "upcoming" }: {
  filters: BillFilters;
  view?: "upcoming"|"history";
  onApply: (value: BillFilters) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(filters);
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-background">
          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            <View className="flex-row items-center gap-3">
              <Button variant="outline" size="icon" accessibilityLabel="Back to upcoming bills" onPress={onClose}>
                <Ionicons name="chevron-back" size={22} color={colors.foreground} accessible={false} />
              </Button>
              <Text accessibilityRole="header" className="flex-1 text-3xl font-semibold">Filter bills</Text>
            </View>
            <CategorySelector inline value={draft.category} options={billCategoryOptions} onChange={category => setDraft({ ...draft, category })} onClear={() => setDraft({ ...draft, category: undefined })} />
            {view==="upcoming" ? <><Text className="font-semibold">Status</Text>
            <View className="flex-row flex-wrap gap-2">
              {([undefined, "PENDING", "OVERDUE"] as const).map((status) => (
                <Button key={status ?? "all"} variant={draft.status === status ? "default" : "outline"} accessibilityState={{ selected: draft.status === status }} onPress={() => setDraft({ ...draft, status })}>
                  <Text className="capitalize">{status?.toLowerCase() ?? "All unpaid"}</Text>
                </Button>
              ))}
            </View>
            </>:<Text className="text-sm text-muted-foreground">History shows paid bills only.</Text>}
            <Text className="font-semibold">Repeat</Text>
            <View className="flex-row flex-wrap gap-2">
              {([undefined, true, false] as const).map((isRecurring) => (
                <Button key={String(isRecurring)} variant={draft.isRecurring === isRecurring ? "default" : "outline"} accessibilityState={{ selected: draft.isRecurring === isRecurring }} onPress={() => setDraft({ ...draft, isRecurring })}>
                  <Text>{isRecurring === undefined ? "All bills" : isRecurring ? "Recurring" : "One-time"}</Text>
                </Button>
              ))}
            </View>
            <Button onPress={() => onApply(draft)}><Text>Apply filters</Text></Button>
            <Button variant="outline" onPress={() => onApply({})}><Text>Clear filters</Text></Button>
            <Button variant="ghost" onPress={onClose}><Text>Cancel</Text></Button>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
