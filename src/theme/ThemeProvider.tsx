import * as SecureStore from "expo-secure-store";
import { vars } from "nativewind";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, View, useColorScheme } from "react-native";

import { DEFAULT_THEME, themes, themeVariables, type AppTheme, type ThemePreference } from "@/constants/theme";

const KEY = "divvy.theme.preference";
const ThemeContext = createContext<(AppTheme & {
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  saveError: string | null;
}) | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemMode = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME);
  const [saveError, setSaveError] = useState<string | null>(null);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const saved = Platform.OS === "web"
          ? (typeof window === "undefined" ? null : window.localStorage.getItem(KEY))
          : await SecureStore.getItemAsync(KEY);
        if (active && !changed.current && (saved === "light" || saved === "dark" || saved === "system")) {
          setPreferenceState(saved);
        }
      } catch { /* Keep the system preference when storage is unavailable. */ }
    }
    void restore();
    return () => { active = false; };
  }, []);

  function setPreference(value: ThemePreference) {
    changed.current = true;
    setPreferenceState(value);
    setSaveError(null);
    writes.current = writes.current.then(async () => {
      try {
        if (Platform.OS === "web") window.localStorage.setItem(KEY, value);
        else await SecureStore.setItemAsync(KEY, value);
      } catch {
        setSaveError("Theme changed, but couldn't be saved for the next launch.");
      }
    });
  }

  const mode = preference === "system" ? (systemMode === "dark" ? "dark" : "light") : preference;
  const theme = themes[mode];
  return (
    <ThemeContext.Provider value={{ ...theme, preference, setPreference, saveError }}>
      <View style={[{ flex: 1, backgroundColor: theme.colors.background }, vars(themeVariables(theme))]}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme must be used inside ThemeProvider");
  return theme;
}
