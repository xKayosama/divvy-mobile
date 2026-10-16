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

### Dashboard spending periods (added 2026-10-16)

- Month-over-month comparison added 2026-10-16: nullable `data.spendingComparison` compares this_month with last month, or last_month with the preceding month; all_time returns null. Shape: `{ timeZone: "UTC", basis: "calendar_month", current: { startDate, endDate, amount, isInProgress }, previous: { startDate, endDate, amount }, difference, percentageChange, direction }`. Dates are inclusive labels. Difference is selected minus previous; direction is increase/decrease/unchanged. Amounts use cents and match selected spending totals. Percentage is signed, rounded to two decimals, and null whenever previous amount is zero, including both empty. Going from nonzero to zero returns -100. Only group expenses contribute; bills/settlements and current balances remain independent. Full calendar-month windows match existing period totals (including future-dated recorded expenses); `current.isInProgress` is true for this_month. Mobile shows the amount difference, prior calendar month name/total, percentage change when available, and an in-progress note inside the spending card. All time and older responses without comparison omit it. Zero prior spending is explained without showing a percentage. Comparisons use the selected period cache and refresh with existing dashboard invalidation.

- Category breakdown added 2026-10-16: `data.spendingByCategory` contains `{ category, amount, count, percentage }` entries for the selected group/period. Each expense contributes its full amount once; bills and settlements are excluded. Amounts accumulate in cents and reconcile with summary.totalExpenses/totalPaid. Entries sort by amount descending, then category alphabetically. Only recorded categories appear; no expenses returns `[]`. Percentages round independently to two decimals and may total 99.99 or 100.01. Legacy missing/unknown categories fall back to OTHERS; known casing/whitespace is normalized in the response. No schema changes, migration or new endpoint. Mobile displays a Spending by category card below the spending total, following the selected period. It shows category icons, currency amounts, counts, percentages and proportional bars. The first three categories appear initially with Show all/Show less; changing period/group resets expansion. Tapping a category opens Expenses with that category and the response period's inclusive date bounds. All time clears date bounds; each visit resets search, pagination and earlier filters. Parameters are validated before applying, and users can edit/clear the filters normally. Empty arrays show No spending in this period; older responses without the field omit the card.

- `GET /api/groups/:id/dashboard?period=this_month` accepts exactly `all_time`, `this_month`, or `last_month`; omission defaults to all_time. Invalid, blank, structured or repeated values return 400. Existing authentication/ACTIVE membership checks remain in place.
- Only `data.summary` (totalExpenses, totalPaid, totalOwed) and `data.recentExpenses` use the selected expense `date` range. Recent previews remain the newest five by date/createdAt. UTC calendar months include their full final day; this_month covers the entire month, including future-dated expenses within it. Balances/settlement effects use all history; bill totals, upcoming bills and reminders stay current.
- New `data.period` is `{ value, timeZone: "UTC", startDate, endDate }`; date labels are inclusive YYYY-MM-DD, or both null for all_time. Example this_month on 2026-10-16: startDate 2026-10-01, endDate 2026-10-31. No schema change or migration is required. Mobile provides This month, Last month and All time controls (default All time), with separate period/group query caches. Selection is scoped to its group; another group starts at All time. The spending card shows the period and inclusive UTC dates. Current balances and bill sections are explicitly distinguished from period spending. Pull-to-refresh/focus/resume/midnight refresh retain the selected period; bill/expense mutations invalidate every period for the group.

Routes use `/api/groups`, not `/api/households`. Responses use `data.group` / `data.groups`; related records use `groupId`.

Group routes cover CRUD and membership, plus `/:id/expenses`, `/:id/bills`, `/:id/balances`, `/:id/settlements`, and `/:id/dashboard`. Standalone expense and bill routes also mount under `/api/expenses` and `/api/bills`. Inspect the relevant module routes/controllers for exact methods and payloads.

Receipt scan: `POST /api/groups/:id/receipts/scan`, bearer authentication and active group membership, multipart file field `receipt`. Supports JPEG, PNG, WebP, PDF up to 10 MB. Returns extracted receipt data requiring an editable review step; scanning does not create an expense. See the backend README for the full contract.

The backend also generates recurring bill occurrences. See its README and bills module before implementing recurring bill UI.

## Next mobile integration work

Mobile authentication now has typed responses, native secure token persistence (web uses sessionStorage), session restoration via `/auth/me`, bearer request headers, protected routes, logout, and registration. Group listing/creation, the group dashboard, and expense listing/creation are implemented. Verify relevant backend contracts before extending these flows.

Keep credentials, tokens, and environment secrets out of this document.

## Mobile receipt scanning (verified 2026-10-16)

Source: `src/modules/receipts/receipt.{routes,controller,schema,upload,ocr}.js` and backend README.

- `POST /api/groups/:id/receipts/scan` requires a bearer token and ACTIVE membership. Send multipart FormData with exactly one file under `receipt`, without other form fields. Do not set Content-Type manually; the runtime generates the multipart boundary. Maximum 10 MiB; JPEG, PNG, WebP and PDF supported by the backend, with content signatures validated.
- HTTP 200: `{ success: true, message, data: { groupId, requiresReview: true, receipt } }`. Receipt fields: `isReceipt`, nullable merchant/date/currency/subtotal/tax/tip/total, items with nullable description/quantity/unitPrice/total, and warnings. Date is YYYY-MM-DD; currency is a three-letter code. No expense is created, no image attachment is persisted, and no public file URL is returned.
- Errors include 413 too large, 415 unsupported/mismatched content, 422 unreadable/nonreceipt, 429 throttling, 503 PDF renderer unavailable, 504 OCR timeout. Backend OCR has a 60-second deadline; the mobile upload overrides the default request timeout to 75 seconds and aborts when leaving the scan screen.
- Mobile supports taking a photo on native and selecting an image on native/web using SDK-compatible Expo ImagePicker. Images are normalized to JPEG with ImageManipulator, capped at 2400 pixels on the longest side, and checked against the upload limit. PDF selection is not currently exposed in mobile. The camera asks permission when used; the system image picker does not request broad photo-library access. Native camera/photo permission descriptions are configured through the plugin, with microphone permission disabled.
- SDK 57 installs `expo/fetch` as global fetch on native. Its multipart encoder does not support legacy React Native `{ uri, name, type }` objects. Native uploads append an `expo-file-system` File so the encoder can read its bytes; web uploads append a Blob. The upload helper checks file existence and size. Regression coverage runs the actual installed Expo multipart encoder against the new File-compatible object and verifies that the old descriptor is rejected.
- Scanning prefills an editable expense form with merchant description, total, date and item descriptions in notes. Missing totals/dates remain blank and require entry. Source photo, item details, subtotal/tax/tip, and warnings remain visible for comparison. Category, payer, participants and split are chosen by the user. Explicit review acknowledgement is required; a currency mismatch prompts entry of an amount in the group's currency, with no automatic exchange conversion. Saving uses the existing expense endpoint and cache invalidation.
- Both added modules are included in Expo Go. Existing custom development builds need rebuilding to include the packages and permission configuration. No native folders are edited manually.

## Settlements and repayments (verified 2026-10-16)

Source: backend commit `3469c76`, `src/modules/settlements/{Settlement.js,settlement.routes.js,settlement.controller.js,settlement.balances.js}`, balance and dashboard controllers.

- `GET /api/groups/:id/settlements`: ACTIVE membership and bearer authentication; returns `{ success: true, data: { settlements: [{ from, to, amount }] } }`. From/to are populated users. These are current suggestions, not payment history; recorded repayments reduce the suggested amounts.
- `POST /api/groups/:id/settlements`: body `{ to: userId, amount: number, paidAt: ISO timestamp, requestId?: string }`. Sender and recorder are always the authenticated user. Sending a different `from` is forbidden (403). Recipient must be a different ACTIVE member; amount must be positive, finite, safe in cents, and have at most two decimals. Payment date must be valid and not in the future. Invalid input returns 400. Success returns HTTP 201 with `data.settlement`; from/to/recordedBy are raw IDs in this response.
- `GET /api/groups/:id/settlements/history?page=1&limit=10`: returns `data.settlements` populated at from/to/recordedBy plus `pagination: { page, limit, total, totalPages }`. Page must be a positive integer (maximum 1,000,000); limit 1–100. Order is paidAt, createdAt, _id descending. Mobile handles missing populated accounts.
- Balances/dashboard retain purchase `paid`/`owed` totals and add `settlementPaid`, `settlementReceived`; net is `paid - owed + settlementPaid - settlementReceived`. Bills do not participate. Suggestions/balances use ACTIVE group membership.
- Mobile provides a dashboard Settle up action, suggestions (prefill only the current sender's payments), paginated history, recipient/amount/date entry, explicit review, and success confirmation. Only payments sent by the current user can be recorded. Date selection is converted from local calendar midnight to ISO; today/past dates are allowed. Saving invalidates history and Dashboard tags, refreshing balances and suggestions. Expense/member mutations also refresh suggestions through the Dashboard tag.
- Duplicate protection added on 2026-10-16: payments must match an outstanding suggested sender/recipient pair and cannot exceed its remaining amount. Settled/stale/excessive requests return 409. Suggestions are deterministically ordered by user ID. A unique per-pair balance-state claim prevents two concurrent requests from recording against the same snapshot; partial payments can be followed by the remaining amount after refresh.
- Mobile creates a requestId when reviewing a payment and reuses it on retry. IDs are scoped to group/sender, must be 8–128 alphanumeric/underscore/hyphen characters, and are protected by a unique partial index. Identical retries return HTTP 200 with the original payment; changed details under the same ID return 409. The backend ensures unique indexes before writes and fails closed if they cannot be created.
- The form offers only outstanding recipients, shows the remainder, guards duplicate taps, and fetches current suggestions immediately before saving. 409 refreshes history/suggestions/dashboard. No repayment edit/delete endpoint is present. Recording a payment does not transfer money.

## Group members (verified 2026-10-16)

Source: `src/modules/groups/group.routes.js`, `group.controller.js`, and `groupAccess.middleware.js`.

- `GET /api/groups/:id/members`: bearer authentication and ACTIVE membership. Returns HTTP 200 with `data.members`, containing active membership records populated at `userId` with firstName, lastName, email, avatar. Mobile displays owner first, role badges, and the current user's label; missing user references have an unavailable-account fallback.
- `POST /api/groups/:id/members`: requires an ACTIVE OWNER membership; body `{ email }`. Adds an already registered user directly, without an invitation/email step. Mobile trims/lowercases the email before sending. HTTP 201 returns `data.member: { id, firstName, lastName, email, role, joinedAt }`; `id` is the user ID, not the membership ID. An INACTIVE membership is reactivated instead of duplicated.
- Nonowners return 403, unregistered emails 404, and existing active members 409. Mobile preserves form state on errors and confirms success by name. Successful addition refreshes group/member caches (including expense/bill payer selections) and the group's dashboard.
- `DELETE /api/groups/:id/members/:userId`: ACTIVE OWNER only, using the user's ID rather than the membership ID. Sets membership to INACTIVE; HTTP 200 returns `{ success: true, message }`. Owner self-removal returns 400, missing active membership 404, nonowner 403. Prior expense/bill records are retained. Removal does not record a settlement. Mobile requires a named confirmation, blocks owner/self-removal, and refreshes group/member and dashboard caches on success.
- `PUT /api/groups/:id`: ACTIVE group membership plus `group.ownerId === current user` required. Renaming sends only `{ name }`, trimmed and nonempty. HTTP 200 returns `data.group`; blank names return 400, nonowners 403. Mobile settings prefill the current name and refresh group caches after saving. Currency is shown read-only.
- Removal/renaming reverified against current routes/controllers on 2026-10-16. Direct mobile management routes check owner membership as well as hiding controls from regular members; backend authorization remains authoritative. Forms preserve input after errors and guard against duplicate submissions.

## Bill search and filters (verified 2026-10-16)

### Bill reminders and due-date status (added 2026-10-16)

- `GET /api/groups/:id/dashboard` adds `data.billReminders` under the existing bearer/ACTIVE membership checks. It contains `asOf` (ISO timestamp), `timeZone: "UTC"`, `windowDays: 7`, and `overdue`, `dueToday`, `dueSoon` groups. Each group has `{ count, amount, bills }`: full matching count/amount in group currency, plus up to five populated bill previews ordered by dueDate then ID. Due soon means tomorrow through day seven inclusive; today is separate. Paid bills are always excluded. Mobile shows a compact reminders card with Overdue, Today and Next 7 days tabs, prioritizing the first nonempty group. It displays full group count/amount and up to five bill previews, using UTC date labels. Tapping a bill opens payment review; All bills opens the Bills tab. The old Coming up card is retained only as a fallback for older backend responses.
- Bill status is now computed on reads: PAID is preserved; other bills are OVERDUE before today's UTC midnight, otherwise PENDING. The entire UTC due day remains pending, matching existing date-only UTC storage. Legacy saved OVERDUE values on future bills are returned as PENDING. No stored-status migration or scheduled update is required. Bill list/detail and create/update responses use computed status; dashboard summaries agree. Existing `upcomingBills` now includes today.
- Bill status filters apply equivalent database date conditions before pagination/counting and combine with search/category/recurring filters. Invalid status values return 400. Paid edit/delete locks are unchanged. Mobile refreshes the dashboard on focus, app resume while focused, and UTC midnight while focused, in addition to pull-to-refresh and bill mutation invalidation. This adds no push notifications.

- `GET /api/groups/:id/bills` supports `search`, `category`, `status`, `isRecurring`, `page`, and `limit` (1–100). Verified against the current bills controller. Search matches literal, case-insensitive substrings in name or notes, trims whitespace, and allows up to 200 characters. Category/status are uppercased. `isRecurring` must be the string `true` or `false`; omission includes both. Results sort by dueDate ascending and createdAt descending; counts use the same combined filters.
- The dashboard Pending bills and Overdue bills cards open the Bills tab with only PENDING or OVERDUE applied, respectively, clearing prior search/category/repeat filters and resetting pagination. Each shortcut visit resets the screen, including repeated visits after changing filters. Users can edit or clear this status through the normal dialog.
- Mobile provides animated expandable search with a 350 ms debounce and a category/status/repeat dialog. Applying search/filters resets pagination; refresh and paging retain them. One-time bills explicitly send `isRecurring=false`. Clear search preserves filters; the empty-state action clears both. Bill mutation invalidation refreshes filtered lists.

## Bill creation and payment (verified 2026-10-15)

### Payment timestamp (added 2026-10-16)

- Bills now include nullable `paidAt` (ISO timestamp). Marking an unpaid bill PAID records server time in the same conditional update as status/payer. Creation directly with `status: "PAID"` also sets server time. Client-supplied `paidAt` is ignored; unpaid bills keep null. The existing paid-bill lock prevents duplicate/repeated payments from overwriting the date.
- This is the time payment was recorded, not a historical payment date entered by the member. List/detail/create/update responses expose it; existing paid bills without a date return null. No migration or guessed backfill from `updatedAt` is performed. Mobile paid bill cards show the populated payer (or Unknown member) and the payment-recorded date/time in the device locale/timezone. Missing or invalid dates show Payment date unavailable. The dashboard View paid bills shortcut opens only PAID bills, resetting earlier search/filters and pagination.

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

- `GET /api/groups/:id/expenses` returns `data.expenses` and top-level `pagination`; accepts `page`, `limit` (1–100), `search`, `category`, `startDate`, and `endDate` (`YYYY-MM-DD`). Results sort by date and creation time descending.
- Description search verified on 2026-10-16: `search` is a trimmed, case-insensitive literal substring (maximum 200 characters after trimming). Blank search leaves results unfiltered; non-string or overlong values return HTTP 400. Search combines with group scope, category and date filters for both results and pagination totals. Example: `GET /api/groups/:id/expenses?search=groceries&category=FOOD`. Mobile provides a description search field with a 350 ms debounce, a 200-character limit and a clear action. Search resets pagination to page one, combines with category/date filters, and remains applied during refresh and pagination. Pending searches hide previous results; empty results offer clearing search and filters.
- Filtering reverified against `expense.routes.js` and `expense.controller.js` on 2026-10-15: category is uppercased; start date is inclusive UTC midnight and end date includes the entire UTC day. Either date can be omitted. The mobile filter dialog validates calendar dates and range order, applies category/date filters together, resets pagination to page one, and can clear all filters. Pagination and refresh retain the applied filters. Filtered results use separate RTK Query cache entries and share group invalidation tags.
- `POST /api/groups/:id/expenses` accepts description, positive amount, category, paidBy, splitType, participants, optional date and notes. Payer and unique participants must be active members. Returns HTTP 201 with `data.expense`, populated payer and participant users.
- EQUAL participants contain `userId`; the backend assigns the rounded remainder to the first participant. EXACT participants also contain nonnegative `amount` and must sum to the expense total. PERCENTAGE participants contain `percentage` between 0–100 and must total 100%; the backend adjusts the last participant for rounding.
- The mobile form supports all three split types and a calendar date. Compact expense cards open the details screen, which shows payer, category, UTC expense date, notes, split type and server-calculated participant shares/percentages, including missing-account fallbacks. Detail fetches the expense by ID, verifies it belongs to the route group, and handles loading, retry, 403 and 404 states without exposing mismatched data. Edit uses the existing form; delete requires a named/amount confirmation and prevents duplicate taps. Success refreshes list/detail/dashboard; deletion returns to an unfiltered page-one list. Saving invalidates group expenses and dashboard caches.

### Expense editing and deletion (verified 2026-10-15)

Source: `src/modules/expenses/expense.routes.js`, `expense.controller.js`, and mounts in `src/app.js`.

- `GET /api/expenses/:expenseId`: HTTP 200 with `data.expense`, including populated payer and participant users.
- `PUT /api/expenses/:expenseId`: accepts the same fields as creation; omitted fields retain existing values. HTTP 200 returns `data.expense`. Splits are recalculated and the payer and participants must all be active members. The mobile edit form submits the complete validated expense.
- `DELETE /api/expenses/:expenseId`: HTTP 200 returns `{ code: 200, success: true, message }` without expense data.
- All three require bearer authentication and ACTIVE membership in the expense's group. Any active member can edit/delete, regardless of who paid; there is no owner-only restriction. Missing expenses return 404; nonmembers return 403.
- Mobile editing loads the expense by ID, checks its group against the route, and prepopulates the existing form. Unavailable payers/participants must be replaced/removed before saving. Deletion requires confirmation displaying description and amount. Successful edits/deletions invalidate the group's expense list, expense detail, and dashboard; deletion returns pagination to page one.
