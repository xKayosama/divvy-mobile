# App themes

`src/constants/theme.ts` is the source of truth for colors. Edit `lightColors` and
`darkColors` there to change a palette. The shared `createTheme` function defines
status badges, gradients, card surfaces, and glass navigation for both modes.

`ThemeProvider` wraps the app, applies NativeWind CSS variables, follows device
appearance in System mode, and saves the preference using SecureStore on native
or localStorage on web. The preference is independent of authentication.

Users choose Light, Dark, or System in Profile → Appearance. Change
`DEFAULT_THEME` in `src/constants/theme.ts` to change the initial preference.

For inline styles, read the active theme inside the component:

```tsx
const { colors, surfaces } = useTheme();
return <View style={surfaces.card}><Text style={{ color: colors.foreground }}>Hello</Text></View>;
```

Import `useTheme` from `@/theme/ThemeProvider`. NativeWind classes such as
`bg-card`, `text-foreground`, and `border-border` use the same palette automatically.
Avoid hardcoded theme colors or imports of a static palette; they will not react
to theme changes. Keep text on the always-green spending gradient white.

Run `node --test test/theme.test.cjs` to check text contrast and variable output,
then run `npx expo lint` and `npx tsc --noEmit`.
