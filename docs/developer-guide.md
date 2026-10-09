# Divvy developer guide

This guide describes the repository as of October 9, 2026. Read [AGENTS.md](../AGENTS.md) before changing code and [backend.md](backend.md) before working on authentication or backend integration.

## Current scope and stack

Divvy targets iOS, Android, and web. Registration, login, session restoration, protected navigation, and logout are implemented. Home displays the signed-in user and a groups placeholder. Group management, expenses, bills, balances, settlements, and receipt scanning are future mobile work.

| Concern | Implementation |
| --- | --- |
| Runtime | Expo SDK 57, React Native 0.86.3, React 19.2.3 |
| Language | Strict TypeScript |
| Navigation | Expo Router |
| State and requests | Redux Toolkit, React Redux, RTK Query |
| Styling | NativeWind 4, Tailwind CSS 3, shared UI primitives |
| Token storage | Expo SecureStore on native; sessionStorage on web |
| Package manager | npm with package-lock.json |
| Tests | Node test runner with mocked fetch and native dependencies |

Use the [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/) for Expo and React Native changes. SDK 57 documents a minimum Node version of 22.13.x. Recheck package.json and the matching versioned documentation after upgrading; also consult the [Expo documentation index](https://docs.expo.dev/llms.txt).

## Local setup

1. Install compatible Node.js and npm, then run `npm ci` from this repository.
2. Set up the backend separately. Its local path is `/Users/m2/household-expense-tracker-backend`. Follow its README for MongoDB, environment variables, and installation, then run `npm run dev` there.
3. Create `.env.local` in the mobile repository:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://192.168.1.10:5000/api
   ```

   Replace the example address with your reachable backend host and port. Include `/api`; client endpoints use relative paths such as `/auth/login`.

4. Run `npm start` and open your chosen target.

A physical phone needs your computer's LAN address or another reachable hostname. Localhost on a phone refers to the phone itself. Metro connectivity and backend connectivity are separate; verify both.

`.env.local` is ignored by Git. Expo embeds `EXPO_PUBLIC_` values into the app bundle, so use them only for public configuration, never backend secrets or tokens. Fully reload the app after changing the URL. See the [environment variable guide](https://docs.expo.dev/guides/environment-variables/).

## Commands

| Task | Command |
| --- | --- |
| Start Metro | `npm start` |
| Open Android | `npm run android` |
| Open iOS | `npm run ios` |
| Open web | `npm run web` |
| Clear Metro cache | `npx expo start --clear` |
| Lint | `npm run lint` |
| Typecheck | `npx tsc --noEmit` |
| Auth tests | `npm run test:auth` |
| Diagnose dependencies/config | `npx expo-doctor` |
| Install a compatible package | `npx expo install <package>` |
| Repair SDK version mismatches | `npx expo install --fix` |

The Android/iOS scripts start Expo with a target; they do not build native binaries. The `reset-project` script points to a missing `scripts/reset-project.js`, so do not use it for onboarding. This checkout uses npm; if it moves to Bun and gains bun.lock, follow AGENTS.md and use bunx instead of npx.

## Project structure

```text
src/
  app/                 Route screens and navigator layouts
    _layout.tsx        Providers, restoration gate, protected stacks
    index.tsx          Entry redirect
    (auth)/            Login and registration
    (app)/             Signed-in routes, currently home
  components/
    auth/              AuthScreen, headings, fields, messages
    brand/             Brand mark and wordmark
    ui/                Shared Button, Input, and Text
  constants/theme.ts   Colors and layout constants
  features/auth/       Endpoints, types, slice, storage, session lifecycle
  hooks/redux.ts       Typed Redux hooks
  lib/                 Class-name utility and theme definitions
  services/api.ts      Shared RTK Query API and bearer/error handling
  store/index.ts       Redux store and API middleware
  global.css           Tailwind directives and semantic color variables
test/auth.test.cjs      Auth/API regression tests
docs/backend.md        Backend integration context
```

Use `@/` to import from src; `@/assets/` maps to root assets. Keep components, hooks, utilities, and API modules outside src/app so they are not interpreted as routes.

## Navigation and authentication

The root layout installs Redux, safe-area, and session providers. Navigation waits for restoration, showing a loading state or retryable error first. Users without a session see the auth stack; authenticated users see the app stack. The entry route redirects to login or home.

Use Expo Router for navigation and import helpers from expo-router. Put authenticated screens in `(app)` and preserve the session gate. Backend authorization remains necessary independently of UI route guards. See the [Router introduction](https://docs.expo.dev/router/introduction/).

SessionProvider owns persistence and session transitions:

- On launch, read the saved token and validate it through `/auth/me`.
- On login, save the returned token, reset the API cache, and set the session.
- A 401 for the current token clears credentials. A late response cannot clear a newer session.
- Restoration network failures preserve the saved token and display Try again.
- Logout calls the backend first. Success or 401 clears local state; other failures remain retryable.

Registration creates an account and then offers sign-in; it does not establish a session. Use `useSession().signIn()` and `clear()` for session transitions rather than bypassing storage and cache cleanup. Native storage uses SecureStore; web storage is scoped to the browser session.

## Adding backend features

The shared API reads EXPO_PUBLIC_API_URL, adds the bearer token, applies a 15-second timeout, and handles current-session 401 responses. Feature modules extend it using api.injectEndpoints; authApi.ts is the existing example. Its reducer and middleware are already registered in the store.

1. Read backend.md and inspect the backend's current relevant routes, controllers, and middleware under src/modules.
2. Verify HTTP methods, request fields, status codes, authorization, and response envelopes.
3. Add typed requests/responses and an API module under `src/features/<feature>/`.
4. Use generated query/mutation hooks. Keep server data in RTK Query and temporary form state local.
5. Plan mutation invalidation or refetch behavior. Shared cache tag types are not currently configured; add them if using tag-based invalidation.
6. Implement loading, errors, empty states, retries, and duplicate-submit protection.
7. Update backend.md when verified contracts change and add relevant regression coverage.

The backend summary uses `/api/groups`, data.group/data.groups, and groupId. Do not infer payloads from design references. No refresh endpoint is documented in the current auth router. Reverify source before implementing integrations.

## UI conventions

Reuse Button and Text from components/ui. Authentication screens share AuthScreen, AuthHeading, FormField, and FormMessage. FormField forwards TextInput props, manages focus styling, and provides an accessible password visibility control.

Prefer semantic classes such as bg-background, text-foreground, and border-border. Review global.css, constants/theme.ts, and lib/theme.ts together when changing colors. Automatic system UI configuration does not prove that every screen supports dark mode.

Tailwind currently scans src/app and src/components only. If JSX with classes moves under src/features or another directory, update tailwind.config.js content paths. Keep class names statically discoverable.

Design for small phones first: respect safe areas, preserve keyboard scrolling, provide accessible labels and error announcements, and verify disabled/loading states. AuthScreen deliberately handles keyboard behavior differently by platform. For growing collections, use virtualized lists instead of rendering every record in a ScrollView.

The supplied HTML wireframe is a design reference, not a checked-in implementation specification. Map its interactions to verified API capabilities and record material design deviations when implementing screens.

## Validation

Run lint and typecheck for every change, plus relevant tests:

```bash
npm run lint
npx tsc --noEmit
npm run test:auth
```

The auth suite covers request contracts, bearer headers, unauthorized-session clearing, network/logout failures, stale responses, storage failures, and missing configuration. It does not render screens or exercise a real backend/device.

For auth or layout changes, manually check registration, duplicate email errors, invalid credentials, login, restart/restoration, offline restoration and retry, logout, password visibility, access to the last field with the keyboard open, and repeated submit taps. Check relevant behavior on iOS, Android, and web. Record validation performed and unavailable targets in the handoff.

## Builds and releases

Native directories are generated and ignored. Configure native behavior through app.json and config plugins; do not hand-create or edit ios/android.

No eas.json is present yet. Configure EAS build profiles, app identifiers, signing, and environments before using a release workflow. Follow the [EAS Build guide](https://docs.expo.dev/build/introduction/) and invoke the CLI using `npx eas-cli@latest <command>`.

After a development profile exists, cloud development builds can use:

```bash
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile development --platform android
```

Expo Go includes only its bundled native modules. Native dependencies outside that bundle require a development build. Submission and OTA updates need their own EAS setup; this repository does not yet establish a submission or update pipeline.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API URL missing | Set EXPO_PUBLIC_API_URL, include /api, and reload. |
| Phone cannot reach backend | Check LAN host, backend port/binding, firewall, and network independently of Metro. |
| Web requests blocked | Inspect browser network errors and backend CORS configuration. |
| Restoration error | Confirm backend availability, then use Try again. |
| Unexpected return to login | Inspect protected-request 401 responses and token validity. |
| Native module unavailable | Use a development build containing the module. |
| New classes have no effect | Check Tailwind content paths/static classes; clear cache if needed. |
| Upgrade dependency mismatch | Read matching SDK docs, run Expo Doctor, and review expo install --fix changes. |

Keep this guide aligned with scripts, routes, authentication behavior, and release setup as the app grows.
