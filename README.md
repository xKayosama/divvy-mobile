# Divvy mobile

An Expo / React Native app for shared expenses, targeting iOS, Android, and web.
Authentication is implemented; home currently contains a groups placeholder.

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
