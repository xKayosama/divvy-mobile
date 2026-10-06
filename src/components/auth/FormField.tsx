import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, type ComponentProps } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";

type Props = ComponentProps<typeof TextInput> & {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  password?: boolean;
};
export function FormField({ label, icon, password = false, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">{label}</Text>
      <View
        className={`flex-row items-center rounded-2xl border bg-background pl-4 ${focused ? "border-primary" : "border-input"}`}
      >
        <Ionicons
          name={icon}
          size={19}
          color={colors.mutedForeground}
          accessible={false}
        />
        <TextInput
          {...props}
          accessibilityLabel={label}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          secureTextEntry={password && !visible}
          style={[props.style, { borderWidth: 0, borderRadius: 0 }]}
          placeholderTextColor={colors.mutedForeground}
          underlineColorAndroid="transparent"
          className="h-14 min-w-0 flex-1 bg-transparent px-3 text-base text-foreground outline-none"
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              visible
                ? `Hide ${label.toLowerCase()}`
                : `Show ${label.toLowerCase()}`
            }
            accessibilityState={{ disabled: props.editable === false }}
            disabled={props.editable === false}
            onPress={() => setVisible(!visible)}
            style={{
              width: 48,
              minHeight: 56,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={21}
              color={colors.mutedForeground}
              accessible={false}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
export function FormMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View className="flex-row items-start gap-2 rounded-xl bg-destructive/5 p-3">
      <Ionicons
        name="alert-circle-outline"
        color={colors.destructive}
        size={18}
        accessible={false}
      />
      <Text
        className="flex-1 text-sm leading-5 text-destructive"
        accessibilityLiveRegion="polite"
      >
        {message}
      </Text>
    </View>
  );
}
