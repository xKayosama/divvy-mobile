# Divvy developer guide

This guide describes the repository as of October 9, 2026. Read [AGENTS.md](../AGENTS.md) before changing code and [backend.md](backend.md) before working on authentication or backend integration.

## Current scope and stack

Divvy targets iOS, Android, and web. Registration, login, session restoration, protected navigation, and logout are implemented. Signed-in users enter the group list. Group listing/creation, the group dashboard, and expense listing/creation have feature screens; bills and group settings currently use placeholders.

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
2. Set up the backend separately. Its local path is `/Users/m2/divvy-backend`. Follow its README for MongoDB, environment variables, and installation, then run `npm run dev` there.
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
    (auth)/            Thin login and registration route wrappers
    (app)/             Groups, group tabs, expense creation, profile
  components/
    auth/              AuthScreen, headings, fields, messages
    brand/             Brand mark and wordmark
    ui/                Shared Button, Input, and Text
  constants/theme.ts   Colors and layout constants
  features/            Feature screens, endpoints, types, and state
  hooks/redux.ts       Typed Redux hooks
  lib/                 Shared class-name utility
  services/api.ts      Shared RTK Query API and bearer/error handling
  store/index.ts       Redux store and API middleware
  global.css           Tailwind directives and semantic color variables
test/auth.test.cjs      Auth/API regression tests
docs/backend.md        Backend integration context
```

Use `@/` to import from src; `@/assets/` maps to root assets. Keep components, hooks, utilities, and API modules outside src/app so they are not interpreted as routes.

## Navigation and authentication

The root layout installs Redux, safe-area, and session providers. Navigation waits for restoration, showing a loading state or retryable error first. Users without a session see the auth stack; authenticated users see the app stack. The entry route redirects to login or groups. The legacy /home route also redirects to groups.

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

Prefer semantic classes such as bg-background, text-foreground, and border-border. Review global.css and constants/theme.ts together when changing colors; the unused lib/theme.ts module has been removed. Automatic system UI configuration does not prove that every screen supports dark mode.

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

Development builds are configured in `eas.json` and use the SDK-compatible
`expo-dev-client`. The app is linked to [@kayosama/divvy-mobile](https://expo.dev/accounts/kayosama/projects/divvy-mobile).

- `development`: internal distribution for a physical iPhone or Android device,
  using the EAS `development` environment.
- `development-simulator`: extends development with `ios.simulator: true` for an
  iOS Simulator build. It cannot be installed on a physical iPhone.
- iOS identifier: `com.kayosama.divvy-mobile`; Android package:
  `com.kayosama.divvy_mobile`.

Validate profiles without starting a build:

```bash
npx eas-cli@latest config --profile development --platform ios
npx eas-cli@latest config --profile development --platform android
```

A physical-iPhone build requires Apple Developer signing and a registered device.
Configure those interactively when preparing the first device build; they have
not been verified by local profile validation. Sign in with
`npx eas-cli@latest login` if the CLI has no active Expo session.

Cloud development build commands (run only when ready to start a build):

```bash
npx eas-cli@latest device:create
npx eas-cli@latest build --profile development --platform ios
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile development-simulator --platform ios
```

After installing the build, run `npm run start:dev` and open the development
server in the app. `EXPO_PUBLIC_API_URL` comes from the local Expo environment
when Metro serves JavaScript. The current `.env` uses a private LAN backend;
keep the backend running and the phone on a network that can reach it. EAS
`development` environment values should use a reachable API URL when cloud
bundling is required. Public Expo variables are embedded in the client, so they
must never contain credentials. No API URL is hardcoded in the build profiles.
A Metro tunnel does not expose the separate backend automatically.

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


## Bill notification setup and testing

1. Install current dependencies and create a **new development build**; the existing binary does not include the new notifications native module/configuration. Use `npx eas-cli@latest build --profile development --platform ios` or `--platform android` (the project uses npm).
2. Configure platform push credentials using `npx eas-cli@latest credentials --platform ios` and `npx eas-cli@latest credentials --platform android`: iOS needs an APNs push key; Android needs FCM v1 credentials plus the Firebase `google-services.json`. Set `GOOGLE_SERVICES_JSON` to its local path (for example in `.env.local`) and configure the same name as an EAS development **file** environment variable for cloud builds. `app.config.js` maps this to `expo.android.googleServicesFile` and rejects Android cloud builds when missing. Obtain the Firebase file for the exact Android package already in app.json. Keep service-account keys and Expo access tokens out of the mobile bundle/repository. Follow https://docs.expo.dev/push-notifications/push-notifications-setup/ for platform-specific steps. No Firebase configuration is fabricated by this change.
3. On the backend, set `BILL_NOTIFICATIONS_ENABLED=true` after credential setup. If enhanced Expo push security is enabled, also set backend-only `EXPO_ACCESS_TOKEN`. Restart the backend and keep it running.
4. Sign in on the native development build, open **Profile → Bill notifications**, tap **Enable bill notifications**, and allow OS permission. Settings should show this device connected and the worker enabled.
5. Tap **Send test notification**, background the app and confirm arrival. Expo acceptance alone is not delivery confirmation. Check the daily worker's receipt status if delivery fails; verify FCM/APNs keys and rebuild after native configuration changes.
6. For a daily reminder, create an unpaid bill due today/tomorrow or overdue in an active group. At/after 9AM device time the worker sends one digest; if today's digest was already sent it waits until tomorrow. Bill day labels follow UTC, matching existing dashboard reminders. Tap it and confirm the correct bill/group opens. Repeat with the app fully closed.
7. Confirm paid/deleted bills disappear from subsequent reminders, leaving/removal/deleting a group removes access, turning off prevents future reminders, and signing out or resetting the password stops the old session's deliveries. A previously queued push may already be in flight. Test a second account to ensure it starts opted out and cannot open the first account's notification.

Web/Expo Go display an unsupported message instead of requesting push permission. Native delivery cannot be validated in the web preview. Notification bodies omit bill descriptions/amounts to reduce lock-screen disclosure. There is no email provider dependency.

### Test the notification inbox

Reload the app after updating the backend. On Your groups, tap the bell beside the title. A pending invitation or an unpaid bill due tomorrow/today/earlier generates an inbox entry even with push disabled. Return to Your groups to see the unread badge. Tap an entry to mark it read and open its destination, or use Mark all read. Read status persists after reopening/signing in on another device. The first bill digest of each UTC date is retained as history; paying a bill does not delete an old reminder. Refresh discovers new invitations; a later UTC date can generate another digest. No old daily reminders are backfilled. Existing push setup is unchanged; no new native build is needed.

### Test profile editing and deletion

Reload after restarting the backend. Profile → Edit profile lets you save first/last names and immediately updates the header/avatar initials. Email changes require the current password and the 8-digit code delivered to the new address; confirmation replaces this session and signs out other devices. Resend's test sender cannot deliver to arbitrary new addresses, so name editing can be tested now, while a different-email end-to-end test may require a verified sender.

Use a disposable account for deletion. Create a solo group and a shared group with another disposable member. Profile → Delete account lists the shared group's next owner and the solo group's permanent deletion. Enter the disposable account's password and DELETE. After confirmation, login with the deleted credentials must fail; the remaining member keeps the shared ledger with Deleted account names and unchanged balances. The solo group disappears immediately and its records purge after the 90-second grace period plus the worker's next minute tick. Keep the backend running for cleanup. Test only disposable accounts; deletion is irreversible.
