const darkColors = {
  background: "#0C1512",
  foreground: "#EDF7F1",

  card: "#16231E",
  cardForeground: "#EDF7F1",

  primary: "#65D9AD",
  primaryForeground: "#09291F",

  secondary: "#213A2F",
  secondaryForeground: "#9BE7C8",

  muted: "#1B2A23",
  mutedForeground: "#9BAFA4",

  accent: "#A1E8CD",
  accentForeground: "#124B3C",

  destructive: "#FF8B8B",
  success: "#75DEA9",

  border: "#2B3E33",
  input: "#2B3E33",
};

const lightColors: typeof darkColors = {
  background: "#F3F8F6", foreground: "#123D33",
  card: "#FFFFFF", cardForeground: "#123D33",
  primary: "#087F65", primaryForeground: "#FFFFFF",
  secondary: "#E5F5EE", secondaryForeground: "#08634F",
  muted: "#EDF4F0", mutedForeground: "#63776F",
  accent: "#A1E8CD", accentForeground: "#124B3C",
  destructive: "#DC2626", success: "#16A34A",
  border: "#DCE9E2", input: "#DCE9E2",
};

export type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | "system";
export const DEFAULT_THEME: ThemePreference = "system";

function createTheme(mode: ThemeMode, colors: typeof darkColors) {
  const dark = mode === "dark";
  const statusColors = dark ? {
    PENDING: { foreground: "#F5CD7B", background: "#3B3020" },
    PAID: { foreground: "#8DE0B5", background: "#20392B" },
    OVERDUE: { foreground: "#FFAAAA", background: "#3C2528" },
  } : {
    PENDING: { foreground: "#92400E", background: "#FEF3C7" },
    PAID: { foreground: "#166534", background: "#DCFCE7" },
    OVERDUE: { foreground: "#991B1B", background: "#FEE2E2" },
  };
  return {
    mode, colors, statusColors,
    brandGradients: {
      spending: ["#10372B", "#15533F", "#176E51"],
      screen: dark ? ["#11251C", "#0C1512", "#101C16"] : ["#E1F3EA", "#F6FAF8", "#EFF8F3"],
    },
    surfaces: { card: {
      backgroundColor: colors.card, borderColor: colors.border,
      borderWidth: 1, borderRadius: 24,
      boxShadow: dark ? "0 4px 16px rgba(0,0,0,0.18)" : "0 4px 16px rgba(18,61,51,0.045)",
    } },
    glass: {
      background: dark ? "rgba(23,38,29,0.96)" : "rgba(246,251,248,0.94)",
      border: dark ? "rgba(155,231,200,0.14)" : "rgba(255,255,255,0.9)",
      gradient: dark
        ? "linear-gradient(160deg, rgba(37,57,46,0.96), rgba(20,36,28,0.94), rgba(29,46,36,0.96))"
        : "linear-gradient(160deg, rgba(255,255,255,0.96), rgba(229,245,238,0.88), rgba(255,255,255,0.92))",
      active: dark ? "rgba(101,217,173,0.16)" : "rgba(193,235,217,0.72)",
      activeBorder: dark ? "rgba(155,231,200,0.2)" : "rgba(255,255,255,0.95)",
    },
  };
}
export const themes = { light: createTheme("light", lightColors), dark: createTheme("dark", darkColors) };
export type AppTheme = ReturnType<typeof createTheme>;

// Both NativeWind classes and inline styles use these same palette values.
export function themeVariables(theme: AppTheme) {
  const variables: Record<string, string> = {};
  for (const [key, hex] of Object.entries(theme.colors)) {
    const name = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    variables[`--${name}`] = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(" ");
  }
  variables["--popover"] = variables["--card"];
  variables["--popover-foreground"] = variables["--card-foreground"];
  variables["--destructive-foreground"] = "255 255 255";
  variables["--ring"] = variables["--primary"];
  return variables;
}
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
} as const;
