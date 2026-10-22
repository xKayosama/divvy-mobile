import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useId, useImperativeHandle, useRef, useState, type ComponentProps, type Ref } from "react";
import { InputAccessoryView, Keyboard, Platform, Pressable, TextInput, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme/ThemeProvider";

type Props = ComponentProps<typeof TextInput> & {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  password?: boolean;
  error?: string;
  inputRef?: Ref<TextInput>;
};
export function FormField({ label, icon, password = false, error, inputRef, ...props }: Props) {
  const accessoryId = useId();
  const localRef = useRef<TextInput>(null);
  useEffect(() => { if (error) localRef.current?.focus(); }, [error]);
  useImperativeHandle(inputRef, () => localRef.current!, []);
  const numericKeyboard = props.keyboardType === "decimal-pad" || props.keyboardType === "number-pad";
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">{label}</Text>
      <View
        className={`flex-row items-center rounded-2xl border bg-background pl-4 ${error ? "border-destructive" : focused ? "border-primary" : "border-input"}`}
      >
        <View className="h-6 w-6 items-center justify-center">
          <Ionicons
            name={icon}
            size={19}
            color={colors.mutedForeground}
            style={{ includeFontPadding: false }}
            accessible={false}
          />
        </View>
        <TextInput
          {...props}
          ref={localRef}
          inputAccessoryViewID={Platform.OS === "ios" && numericKeyboard ? accessoryId : undefined}
          accessibilityLabel={error ? `${label}. ${error}` : label}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          secureTextEntry={password && !visible}
          style={[
            // Avoid a forced lineHeight: native single-line inputs use different
            // baseline metrics from Text and icon fonts.
            { fontSize: 16, paddingVertical: 0, includeFontPadding: false, textAlignVertical: "center" },
            props.style,
            { borderWidth: 0, borderRadius: 0 },
          ]}
          placeholderTextColor={colors.mutedForeground}
          underlineColorAndroid="transparent"
          className="h-14 min-w-0 flex-1 bg-transparent px-3 text-foreground outline-none"
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
      {error ? <Text className="text-sm text-destructive" accessibilityLiveRegion="polite">{error}</Text> : null}
      {Platform.OS === "ios" && numericKeyboard ? (
        <InputAccessoryView nativeID={accessoryId}>
          <View className="items-end border-t border-border bg-card px-4 py-2">
            <Pressable accessibilityRole="button" accessibilityLabel="Done entering number" onPress={Keyboard.dismiss} className="min-h-11 justify-center px-4"><Text className="font-semibold text-primary">Done</Text></Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </View>
  );
}
export function FormMessage({ message }: { message: string }) {
  const { colors } = useTheme();
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
