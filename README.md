# Divvy mobile

An Expo / React Native app for shared expenses, targeting iOS, Android, and web.
Authentication, group listing/creation, member viewing, owner-only member addition/removal and group renaming, dashboards, and expense listing/creation/editing/deletion are implemented. Bills support creation, recurrence, payment recording, and editing/deletion of unpaid bills.

See the [developer guide](docs/developer-guide.md) for setup, architecture, workflows, and troubleshooting.

- [Backend integration context](docs/backend.md)
- [Repository instructions](AGENTS.md)

## Quick start

```bash
npm ci
```

Create `.env.local` with a backend URL reachable from your device, including `/api`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000/api
```

Start the backend separately using its own setup instructions, then run `npm start`.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run test:auth
```
