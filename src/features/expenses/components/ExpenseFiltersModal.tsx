import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "@/theme/ThemeProvider";
import { categoryIcons } from "../categoryIcons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { FormMessage } from "@/components/auth/FormField";
import DateField from "@/components/ui/date-field";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import {
  expenseCategories,
  validateExpenseFilters,
  type ExpenseFilters,
} from "../filters";

export default function ExpenseFiltersModal({
  filters,
  onApply,
  onClose,
}: {
  filters: ExpenseFilters;
  onApply: (filters: ExpenseFilters) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [category, setCategory] = useState(filters.category);
  const [startDate, setStartDate] = useState(filters.startDate ?? "");
  const [endDate, setEndDate] = useState(filters.endDate ?? "");
  const [message, setMessage] = useState("");

  function apply() {
    const next = {
      category,
      startDate: startDate.trim() || undefined,
      endDate: endDate.trim() || undefined,
    };
    const error = validateExpenseFilters(next);
    setMessage(error);
    if (!error) onApply(next);
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-background">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 20 }}
          >
            <View className="flex-row items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                accessibilityLabel="Back to expenses"
                onPress={onClose}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={colors.foreground}
                  accessible={false}
                />
              </Button>
              <Text accessibilityRole="header" className="flex-1 text-3xl font-semibold">
                Filter expenses
              </Text>
            </View>
            <Text className="font-semibold">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {[undefined, ...expenseCategories].map((value) => (
                <Button
                  key={value ?? "all"}
                  variant={category === value ? "default" : "outline"}
                  accessibilityState={{ selected: category === value }}
                  onPress={() => setCategory(value)}
                >
                  <Ionicons
                    name={value ? categoryIcons[value] : "grid-outline"}
                    size={18}
                    color={
                      category === value
                        ? colors.primaryForeground
                        : colors.foreground
                    }
                    accessible={false}
                  />
                  <Text className="capitalize">
                    {value?.toLowerCase() ?? "All categories"}
                  </Text>
                </Button>
              ))}
            </View>
            <DateField
              label="Start date (optional)"
              value={startDate}
              onChange={setStartDate}
            />
            {startDate ? (
              <Button variant="ghost" onPress={() => setStartDate("")}>
                <Text>Clear start date</Text>
              </Button>
            ) : null}
            <DateField
              label="End date (optional)"
              value={endDate}
              onChange={setEndDate}
            />
            {endDate ? (
              <Button variant="ghost" onPress={() => setEndDate("")}>
                <Text>Clear end date</Text>
              </Button>
            ) : null}
            <Text className="text-sm text-muted-foreground">
              Leave either date blank for no limit. Both dates are included,
              using UTC days.
            </Text>
            <FormMessage message={message} />
            <Button onPress={apply}>
              <Text>Apply filters</Text>
            </Button>
            <Button variant="outline" onPress={() => onApply({})}>
              <Text>Clear filters</Text>
            </Button>
            <Button variant="ghost" onPress={onClose}>
              <Text>Cancel</Text>
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
