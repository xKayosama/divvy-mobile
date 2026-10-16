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

## Group members (verified 2026-10-16)

Source: `src/modules/groups/group.routes.js`, `group.controller.js`, and `groupAccess.middleware.js`.

- `GET /api/groups/:id/members`: bearer authentication and ACTIVE membership. Returns HTTP 200 with `data.members`, containing active membership records populated at `userId` with firstName, lastName, email, avatar. Mobile displays owner first, role badges, and the current user's label; missing user references have an unavailable-account fallback.
- `POST /api/groups/:id/members`: requires an ACTIVE OWNER membership; body `{ email }`. Adds an already registered user directly, without an invitation/email step. Mobile trims/lowercases the email before sending. HTTP 201 returns `data.member: { id, firstName, lastName, email, role, joinedAt }`; `id` is the user ID, not the membership ID. An INACTIVE membership is reactivated instead of duplicated.
- Nonowners return 403, unregistered emails 404, and existing active members 409. Mobile preserves form state on errors and confirms success by name. Successful addition refreshes group/member caches (including expense/bill payer selections) and the group's dashboard.
- `DELETE /api/groups/:id/members/:userId`: ACTIVE OWNER only, using the user's ID rather than the membership ID. Sets membership to INACTIVE; HTTP 200 returns `{ success: true, message }`. Owner self-removal returns 400, missing active membership 404, nonowner 403. Prior expense/bill records are retained. Removal does not record a settlement. Mobile requires a named confirmation, blocks owner/self-removal, and refreshes group/member and dashboard caches on success.
- `PUT /api/groups/:id`: ACTIVE group membership plus `group.ownerId === current user` required. Renaming sends only `{ name }`, trimmed and nonempty. HTTP 200 returns `data.group`; blank names return 400, nonowners 403. Mobile settings prefill the current name and refresh group caches after saving. Currency is shown read-only.
- Removal/renaming reverified against current routes/controllers on 2026-10-16. Direct mobile management routes check owner membership as well as hiding controls from regular members; backend authorization remains authoritative. Forms preserve input after errors and guard against duplicate submissions.

## Bill creation and payment (verified 2026-10-15)

Source: `src/modules/bills/bill.routes.js`, `bill.controller.js`, `Bill.js`, group access middleware, and `src/app.js` mounts.

- `POST /api/groups/:id/bills`: accepts `name`, positive `amount`, `category`, `dueDate`, optional `notes`, `paidBy`, `status`, `isRecurring`, and `recurrence`. HTTP 201 returns `data.bill` with populated payer. The mobile form offers Never (default), Weekly, Monthly, and Yearly repeat options. Never sends `isRecurring: false` without recurrence; recurring selections send `isRecurring: true` and `recurrence: "WEEKLY" | "MONTHLY" | "YEARLY"`. All are created without a payer and default to PENDING status. The due date anchors the recurrence schedule. It validates amounts to two decimals and real calendar dates, sending due dates at UTC midnight.
- Categories: RENT, ELECTRICITY, WATER, INTERNET, PHONE, SUBSCRIPTION, INSURANCE, OTHER.
- `GET /api/bills/:billId`: HTTP 200 returns `data.bill`. Missing bills return 404; nonmembers return 403.
- `PUT /api/bills/:billId`: partial updates; omitted fields retain existing values. Marking paid sends `{ status: "PAID", paidBy: "<active member user ID>" }`; HTTP 200 returns `data.bill`. Any supplied payer must be an ACTIVE member. Mobile explicitly asks who paid and confirms the bill name/amount before saving.
- Creation and updates require bearer authentication and ACTIVE group membership, with no owner-only restriction. Backend errors are surfaced with retryable form state.
- Paying a bill updates its status/payer only: no expense, split, transfer, or member balance entry is created. Mobile invalidates bill lists and dashboard caches after creation/payment, plus bill detail after payment. Dashboard bill totals/upcoming bills refetch; expense balances are independent.
- Recurring creation reverified against the bills routes/controller on 2026-10-15: a supported recurrence is required when `isRecurring` is true; a recurrence must not be provided for a one-time bill.
- Unpaid bills support editing/deletion in mobile. Edit prepopulates the bill form; generated occurrences cannot become recurring sources. Deleting a recurring source stops future generation but retains already generated bills; deleting an occurrence removes only that occurrence.
- Paid-bill lock added to the backend on 2026-10-15: `PUT /api/bills/:billId` and `DELETE /api/bills/:billId` return HTTP 409 for PAID bills, including attempts to reopen them. Membership is checked first. Conditional database writes/deletes also reject bills paid concurrently after the initial read. Conflicts return 409 with a message to reload.
- Mobile hides edit/delete on paid bills, blocks direct edit links, and requires deletion confirmation showing name/amount and recurrence effects. Successful changes refresh lists/detail/dashboard; 409 conflicts also refetch these caches so paid bills become locked in the UI. Existing unpaid recurring bills/occurrences can still be marked paid without altering recurrence settings.

## Expense integration

- `GET /api/groups/:id/expenses` returns `data.expenses` and top-level `pagination`; accepts `page`, `limit` (1–100), `category`, `startDate`, and `endDate` (`YYYY-MM-DD`). Results sort by date and creation time descending.
- Filtering reverified against `expense.routes.js` and `expense.controller.js` on 2026-10-15: category is uppercased; start date is inclusive UTC midnight and end date includes the entire UTC day. Either date can be omitted. The mobile filter dialog validates calendar dates and range order, applies category/date filters together, resets pagination to page one, and can clear all filters. Pagination and refresh retain the applied filters. Filtered results use separate RTK Query cache entries and share group invalidation tags.
- `POST /api/groups/:id/expenses` accepts description, positive amount, category, paidBy, splitType, participants, optional date and notes. Payer and unique participants must be active members. Returns HTTP 201 with `data.expense`, populated payer and participant users.
- EQUAL participants contain `userId`; the backend assigns the rounded remainder to the first participant. EXACT participants also contain nonnegative `amount` and must sum to the expense total. PERCENTAGE participants contain `percentage` between 0–100 and must total 100%; the backend adjusts the last participant for rounding.
- The mobile form supports all three split types and a calendar date; expense cards show the server-calculated shares and notes. Saving invalidates group expenses and dashboard caches.

### Expense editing and deletion (verified 2026-10-15)

Source: `src/modules/expenses/expense.routes.js`, `expense.controller.js`, and mounts in `src/app.js`.

- `GET /api/expenses/:expenseId`: HTTP 200 with `data.expense`, including populated payer and participant users.
- `PUT /api/expenses/:expenseId`: accepts the same fields as creation; omitted fields retain existing values. HTTP 200 returns `data.expense`. Splits are recalculated and the payer and participants must all be active members. The mobile edit form submits the complete validated expense.
- `DELETE /api/expenses/:expenseId`: HTTP 200 returns `{ code: 200, success: true, message }` without expense data.
- All three require bearer authentication and ACTIVE membership in the expense's group. Any active member can edit/delete, regardless of who paid; there is no owner-only restriction. Missing expenses return 404; nonmembers return 403.
- Mobile editing loads the expense by ID, checks its group against the route, and prepopulates the existing form. Unavailable payers/participants must be replaced/removed before saving. Deletion requires confirmation displaying description and amount. Successful edits/deletions invalidate the group's expense list, expense detail, and dashboard; deletion returns pagination to page one.
