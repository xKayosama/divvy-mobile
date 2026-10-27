# Divvy mobile

An Expo / React Native app for shared expenses, targeting iOS, Android, and web.
Authentication with email-code password reset, group listing/creation, member viewing, owner-managed invitations with recipient acceptance, member removal and group renaming, dashboards, and expense listing/creation/editing/deletion are implemented. Bills support creation, recurrence, payment recording, and editing/deletion of unpaid bills.

Settle up shows suggested repayments, records payments sent by the current member, and displays paginated payment history. Repayments update dashboard balances separately from purchase totals.

Receipt scanning supports camera photos and image selection, then requires review of extracted values in the expense form before saving. Existing custom development builds need rebuilding after installing the image picker/manipulator modules.

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

Group owners can invite an email from **Group → Invite members** and share the generated code. Recipients register/sign in with that email, open **Your groups → Invitations**, review the code, and accept or decline. No invitation email is sent.

Bill push notifications are available through **Profile → Bill notifications** in a new native development build. Configure FCM/APNs credentials and enable the backend worker before testing delivery; see the developer guide.
