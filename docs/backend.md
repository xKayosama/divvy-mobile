# Divvy backend context

Authentication verified from local backend source on 2026-10-06; expense creation/listing and active membership verified on 2026-10-09. Recheck source before changing integrations; this document is a summary, not a substitute for current code.

## Location and stack

- Backend: `/Users/m2/household-expense-tracker-backend`
- Repository: https://github.com/xKayosama/household-expense-tracker-backend
- Express 5, MongoDB/Mongoose, CommonJS JavaScript.
- Entry points: `server.js` and `src/app.js`; feature code lives in `src/modules/`.
- Backend commands: `npm run dev`, `npm start`, `npm test`.

## Mobile API base URL

The mobile client uses `EXPO_PUBLIC_API_URL` and relative paths such as `/auth/login`. The configured base URL must include `/api`, for example `http://<backend-host>:5000/api`. A physical phone needs a reachable backend hostname or computer LAN address; localhost refers to the phone itself.

## Authentication contract

Source: `src/modules/auth/auth.routes.js`, `auth.controller.js`, `auth.middleware.js`.

- `POST /api/auth/register`: JSON `{ firstName, lastName, email, password }`. HTTP 201 returns `{ success: true, message, data: { user: { id, firstName, lastName, email } } }`. Registration does not return a token. Missing fields return 400; duplicate email returns 409.
- `POST /api/auth/login`: JSON `{ email, password }`. HTTP 200 returns `{ success: true, message, data: { token, user: { id, firstName, lastName, email, role } } }`. Invalid credentials return 401.
- `GET /api/auth/me`: bearer authentication; returns `{ success: true, data: { user: { id, firstName, lastName, email, role } } }`.
- `POST /api/auth/logout`: bearer authentication, no body. HTTP 200 returns `{ code: 200, success: true, message }` and revokes the submitted token. Clear local session on success or 401. On 500, allow a retry.
- Protected requests require `Authorization: Bearer <token>`.
- JWT expiration is configured by `JWT_EXPIRES_IN` (documented default: `7d`). No refresh endpoint is registered in the current auth router.
- Errors generally return `{ success: false, message }`.

## Feature API map

Routes use `/api/groups`, not `/api/households`. Responses use `data.group` / `data.groups`; related records use `groupId`.

Group routes cover CRUD and membership, plus `/:id/expenses`, `/:id/bills`, `/:id/balances`, `/:id/settlements`, and `/:id/dashboard`. Standalone expense and bill routes also mount under `/api/expenses` and `/api/bills`. Inspect the relevant module routes/controllers for exact methods and payloads.

Receipt scan: `POST /api/groups/:id/receipts/scan`, bearer authentication and active group membership, multipart file field `receipt`. Supports JPEG, PNG, WebP, PDF up to 10 MB. Returns extracted receipt data requiring an editable review step; scanning does not create an expense. See the backend README for the full contract.

The backend also generates recurring bill occurrences. See its README and bills module before implementing recurring bill UI.

## Next mobile integration work

Mobile authentication now has typed responses, native secure token persistence (web uses sessionStorage), session restoration via `/auth/me`, bearer request headers, protected routes, logout, and registration. Group listing/creation, the group dashboard, and expense listing/creation are implemented. Verify relevant backend contracts before extending these flows.

Keep credentials, tokens, and environment secrets out of this document.

## Expense integration

- `GET /api/groups/:id/expenses` returns `data.expenses` and top-level `pagination`; accepts `page`, `limit` (1–100), `category`, `startDate`, and `endDate` (`YYYY-MM-DD`). Results sort by date and creation time descending.
- `POST /api/groups/:id/expenses` accepts description, positive amount, category, paidBy, splitType, participants, optional date and notes. Payer and unique participants must be active members. Returns HTTP 201 with `data.expense`, populated payer and participant users.
- EQUAL participants contain `userId`; the backend assigns the rounded remainder to the first participant. EXACT participants also contain nonnegative `amount` and must sum to the expense total. PERCENTAGE participants contain `percentage` between 0–100 and must total 100%; the backend adjusts the last participant for rounding.
- The mobile form supports all three split types and a calendar date; expense cards show the server-calculated shares and notes. Saving invalidates group expenses and dashboard caches.
