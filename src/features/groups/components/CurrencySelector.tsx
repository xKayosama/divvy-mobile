import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { FormField } from "@/components/auth/FormField";
import { useTheme } from "@/theme/ThemeProvider";
import { groupCurrencies, type GroupCurrency } from "../currencies";

export function CurrencySelector({ value, onChange, disabled }: {
  value: string;
  onChange: (currency: GroupCurrency) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { colors } = useTheme();
  const selected = groupCurrencies.find(currency => currency.code === value) ?? { code: value, name: "Current currency", flag: "🌐", minorUnits: 2 };
  const query = search.trim().toLowerCase();
  const filteredCurrencies = groupCurrencies.filter(currency =>
    `${currency.code} ${currency.name}`.toLowerCase().includes(query),
  );

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium">Currency</Text>
      <Button
        variant="outline"
        className="h-auto min-h-14 justify-start"
        disabled={disabled}
        accessibilityLabel={`Currency, ${selected.code}, ${selected.name}. Choose currency`}
        accessibilityState={{ expanded: open }}
        onPress={() => { Keyboard.dismiss(); setSearch(""); setOpen(true); }}
      >
        <Text className="text-2xl" accessible={false}>{selected.flag}</Text>
        <Text className="flex-1 shrink">{selected.code} · {selected.name}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} accessible={false} />
      </Button>
      <Text className="text-sm text-muted-foreground">All amounts in this group use this currency. No exchange conversion is applied.</Text>
      <Text className="text-sm text-muted-foreground">Amounts use {selected.minorUnits === 0 ? "whole units" : `${selected.minorUnits} decimal places`} for {selected.code}.</Text>
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider>
          <SafeAreaView className="flex-1 bg-background">
            <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View className="flex-row items-center justify-between gap-3 px-5 py-3">
              <Text accessibilityRole="header" className="text-xl font-semibold">Choose currency</Text>
              <Button variant="ghost" onPress={() => setOpen(false)}><Text>Cancel</Text></Button>
            </View>
            <View className="px-5 pb-3">
              <FormField label="Search currencies" icon="search-outline" placeholder="Currency name or code" value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
            </View>
            <FlatList
              data={filteredCurrencies}
              extraData={value}
              keyExtractor={currency => currency.code}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ padding: 20, gap: 10 }}
              ListEmptyComponent={<Text className="py-6 text-center text-muted-foreground">No currencies found. Try another name or code.</Text>}
              renderItem={({ item: currency }) => (
                <Button
                  key={currency.code}
                  variant={currency.code === value ? "default" : "outline"}
                  className="h-auto min-h-14 justify-start"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: currency.code === value }}
                  onPress={() => { onChange(currency.code); setOpen(false); }}
                >
                  <Text className="text-2xl" accessible={false}>{currency.flag}</Text>
                  <Text className="flex-1 shrink">{currency.code} · {currency.name}</Text>
                  {currency.code === value ? <Ionicons name="checkmark-circle" size={22} color={colors.primaryForeground} accessible={false} /> : null}
                </Button>
              )}
            />
            </KeyboardAvoidingView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}
