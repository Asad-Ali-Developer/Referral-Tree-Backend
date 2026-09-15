# School Referral Tree API

Multi-tenant referral-tree backend built with **NestJS + Prisma + PostgreSQL + Redis**.

## Setup

```bash
npm install
cp .env.example .env          # adjust DATABASE_URL / REDIS_URL / JWT_SECRET if needed
docker compose up -d          # starts Postgres + Redis
npx prisma migrate dev --name init
npm run start:dev
```

## Walkthrough (matches the Ahmed/Ali/Sara example)

```bash
# 1. Create a school
curl -X POST localhost:3000/schools -H 'Content-Type: application/json' \
  -d '{"name":"Green Valley School"}'
# => { "id": "school_1", ... }

# 2. Create the root user (Ahmed) — the only way to create a user with no referrer
curl -X POST localhost:3000/schools/school_1/root-users -H 'Content-Type: application/json' \
  -d '{"name":"Ahmed","email":"ahmed@example.com","password":"correct-horse"}'
# => { "id": "user_ahmed", "referralCode": "AB12CD34", ... }

# 3. Ahmed logs in
curl -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ahmed@example.com","password":"correct-horse"}'
# => { "accessToken": "eyJ... (15m)", "refreshToken": "eyJ... (7d)" }

# 4. Register Ali under Ahmed's referral code (uses the access token — schoolId
#    comes from it, not the URL)
curl -X POST localhost:3000/schools/school_1/referrals \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <accessToken>' \
  -d '{"name":"Ali","email":"ali@example.com","password":"another-secret","referralCode":"AB12CD34"}'

# 5. Fetch the tree, up to 3 levels
curl localhost:3000/schools/school_1/referrals/tree?depth=3 \
  -H 'Authorization: Bearer <accessToken>'

# 6. Fetch stats rooted at Ahmed, or school-wide if userId is omitted
curl localhost:3000/schools/school_1/referrals/stats?userId=user_ahmed \
  -H 'Authorization: Bearer <accessToken>'

# 7. When the access token expires (15 min), get a new pair without
#    logging in again
curl -X POST localhost:3000/auth/refresh -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'
```

**Auth note:** Access tokens are short-lived (15m) and refresh tokens longer-lived
(7d), signed with **separate secrets** and carrying a `type` claim, so one
can never be replayed as the other. `schoolId` is read out of the **signed
access token**, never out of the URL. `SchoolAccessGuard` compares the
token's schoolId to the URL param and rejects with 403 on mismatch, so a
client can't just edit the URL to read another school's data.

Refresh tokens here are **stateless** — not stored server-side — which is a
deliberate scope tradeoff: there's no logout/revocation and no
reuse-detection if one is stolen and replayed. If that's needed, the natural
next step is a `RefreshToken` table storing a hash of each issued token,
checked and marked used on every `/auth/refresh` call (true rotation with
reuse detection), which is a meaningfully bigger piece of work than what's
here.

## Testing in Postman

A ready-made collection is at `postman/Referral-Tree-API.postman_collection.json`.

1. In Postman: **Import** → select that file. No separate environment file is
   needed — the collection has its own variables (`baseUrl`, `schoolId`,
   `accessToken`, etc.) already attached, defaulting `baseUrl` to
   `http://localhost:3000`.
2. Run the requests **in order, top to bottom**, using the collection's ▶
   "Run" button or just clicking through them once manually. Each one has a
   test script that reads the response and saves what the next request needs
   (`schoolId`, `rootReferralCode`, `accessToken`, `refreshToken`, ...) into
   the collection's variables automatically — you never have to copy-paste an
   ID or token by hand.
3. Requests 1–9 walk through the full happy path: create school → create
   root user → login → refer Ali → refer Sara under Ali → fetch tree → fetch
   stats (two ways) → refresh tokens.
4. Requests 10–13 are **negative tests** that assert the rule-enforcement and
   security guards actually work: duplicate email → 409, self-referral →
   400, wrong `schoolId` in the URL with a valid token → 403, no token at all
   → 401. Postman's test results (pass/fail) confirm each one.
5. Pointing this at a hosted environment instead of localhost: just edit the
   `baseUrl` collection variable.

## Using Neon for PostgreSQL

Neon gives you two connection strings per project — a **pooled** one (hostname
contains `-pooler`) and a **direct/unpooled** one. Put the pooled URL in
`DATABASE_URL` (used for normal app queries) and the direct URL in
`DIRECT_URL` (used only for `prisma migrate`, since PgBouncer's pooled/
transaction-mode connections don't support the prepared statements
migrations need). Both are in Neon's connection details panel — toggle
"Pooled connection" to see both forms of the same string. `sslmode=require`
(which Neon includes by default) works fine with Prisma as-is.

```bash
npx prisma migrate dev --name init   # uses DIRECT_URL
npm run start:dev                    # uses DATABASE_URL (pooled) at runtime
```

**If you've ever pasted a real connection string somewhere it could leak**
(a chat, a public repo, a screenshot) — rotate it. In the Neon console:
your project → Roles → reset the role's password, then update `.env`.


- **`Referral` is a separate model from `User.referredById`.** `referredById`
  is the fast adjacency-list edge used for tree traversal; `Referral` is an
  append-only, timestamped log of the referral event itself (who referred
  whom, when). `referredById` is the source of truth for "who is this user's
  current referrer"; `Referral` is the audit trail.
- **Email is globally unique**, not unique-per-school, since it identifies a
  real person independent of which school context they're in.
- **Referral codes identify the referrer** in `POST .../referrals`, since
  that's the field the spec requires to be unique per user and it's the
  natural "who invited me" token for a signup form.
- **Passwords are hashed with bcrypt** (10 salt rounds) before storage —
  `passwordHash` is never returned by any endpoint or logged.
- **Access/refresh tokens use separate secrets and a `type` claim** rather
  than one secret with two expiries, so a token can't be used for the wrong
  purpose even under a configuration mistake.
- **Bootstrapping:** the referral endpoint can only attach a new user to an
  *existing* referrer, so every school needs at least one root user created
  via the separate `POST /schools/:schoolId/root-users` admin endpoint before
  any referrals can happen.

## Answers to the six questions

**1. How would you model the relationship between School, User, and Referral?**
`School` 1-to-many `User` via `User.schoolId`. `User` is self-referencing via
`referredById` (adjacency list — fast for recursive tree queries). `Referral`
is a separate table with `schoolId`, `referrerId`, and a **unique**
`referredUserId`, acting as the auditable record of the referral event; the
unique constraint is also what makes "can't be referred twice" a database
guarantee rather than an application-level promise.

**2. How would you prevent cross-school referrals?**
Two layers: (a) at write time, `createReferral` looks up the referrer by code
and rejects if `referrer.schoolId !== schoolId` from the URL; (b) at the
schema level, both `User` and `Referral` carry their own `schoolId` FK, so a
query that filters `WHERE schoolId = X` can never accidentally traverse into
another school's rows even via a join, because the join keys never cross a
schoolId boundary in the data itself.

**3. How would you retrieve 5+ levels efficiently?**
A single `WITH RECURSIVE` CTE in Postgres (see `getTree`/`getStats`), rather
than N sequential queries walking down the tree from the app (classic N+1).
The database does the recursion using the `(schoolId, referredById)` index;
the app just flattens the resulting rows into a nested structure in one pass
in memory. This is one round trip regardless of depth, capped by a
`WHERE level < depth` clause pushed into the CTE itself.

**4. Which indexes would you add?**
- `User.referralCode` — unique, used on every referral lookup
- `User.email` — unique, used on every signup dedup check
- `User.schoolId` — tenant-scoped listing queries
- `User.referredById` — parent→children lookups outside the CTE
- `User(schoolId, referredById)` — composite, matches the exact filter shape
  the recursive CTE and most tenant-scoped tree queries use
- `Referral.referredUserId` — unique, enforces "referred at most once"
- `Referral(schoolId, referrerId)` — composite, for per-referrer/per-school
  referral lookups outside the recursive query

**5. How would you handle a school with 100,000+ users?**
- Recursive CTE (above) instead of app-side recursion, so the expensive part
  runs inside Postgres against indexed columns.
- `depth` param caps how much of the tree is ever materialized per request.
- Redis caches tree/stats responses (`remember()`), keyed with a per-school
  version counter that's bumped on every write — so cache invalidation is an
  `INCR`, not a `SCAN`/`KEYS` sweep, and reads never need to know which exact
  keys to delete.
- Redis-backed rate limiting protects against referral-creation floods and
  tree-scraping abuse, shared across all app instances (not per-process).
- If a school's tree gets deep and read-heavy enough that even the CTE
  becomes a bottleneck, the next step would be a closure table or
  materialized-path column maintained on write, trading a bit of write
  complexity for O(1) ancestor/descendant reads — not needed at this scale,
  but the natural next optimization.

**6. How would you prevent unauthorized access to another school's referral tree?**
The `:schoolId` URL param is never trusted as proof of membership — a client
can type any ID into the URL. Instead, `JwtAuthGuard` verifies the caller's
token and extracts `schoolId` from its **signed payload**, and
`SchoolAccessGuard` compares that to the URL param, returning 403 on any
mismatch, before the controller method (and therefore any database query)
ever runs. Guard order matters here: authentication first, then tenant-match,
then rate limiting.

## What's deliberately out of scope for a 1-hour build
Refresh token revocation/rotation-with-reuse-detection (would need a
server-side `RefreshToken` table — see the auth note above), pagination on
the tree endpoint beyond `depth`, admin RBAC on the schools endpoints, and a
closure-table migration — all called out above as the documented next step
rather than implemented, given the time box.