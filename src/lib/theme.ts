import { vars } from "nativewind";

export const NAV_THEME = {
  light: {
    background: "hsl(220 100% 99%)",
    border: "hsl(215 45% 91%)",
    card: "hsl(0 0% 100%)",
    notification: "hsl(0 72% 51%)",
    primary: "hsl(217 92% 53%)",
    text: "hsl(218 69% 20%)",
  },
  dark: {
    background: "hsl(218 69% 10%)",
    border: "hsl(217 30% 20%)",
    card: "hsl(218 55% 14%)",
    notification: "hsl(0 72% 51%)",
    primary: "hsl(217 92% 53%)",
    text: "hsl(0 0% 98%)",
  },
};

const LIGHT_THEME = {
  "--background": "220 100% 99%",
  "--foreground": "218 69% 20%",
  "--card": "0 0% 100%",
  "--card-foreground": "218 69% 20%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "218 69% 20%",
  "--primary": "217 92% 53%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "216 100% 96%",
  "--secondary-foreground": "216 81% 42%",
  "--muted": "216 50% 96%",
  "--muted-foreground": "215 16% 47%",
  "--accent": "39 100% 58%",
  "--accent-foreground": "33 100% 15%",
  "--destructive": "0 72% 51%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "215 45% 91%",
  "--input": "215 45% 91%",
  "--ring": "217 92% 53%",
  "--radius": "0.75rem",
};

const DARK_THEME = {
  "--background": "218 69% 10%",
  "--foreground": "0 0% 98%",
  "--card": "218 55% 14%",
  "--card-foreground": "0 0% 98%",
  "--popover": "218 55% 14%",
  "--popover-foreground": "0 0% 98%",
  "--primary": "217 92% 53%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "217 30% 20%",
  "--secondary-foreground": "0 0% 98%",
  "--muted": "217 30% 20%",
  "--muted-foreground": "215 20% 65%",
  "--accent": "39 100% 58%",
  "--accent-foreground": "33 100% 15%",
  "--destructive": "0 72% 51%",
  "--destructive-foreground": "0 0% 100%",
  "--border": "217 30% 20%",
  "--input": "217 30% 20%",
  "--ring": "217 92% 53%",
  "--radius": "0.75rem",
};

export const THEME = {
  light: vars(LIGHT_THEME),
  dark: vars(DARK_THEME),
};