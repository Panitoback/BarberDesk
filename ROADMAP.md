# Roadmap — BarberQueue

## Status (2026-05-23)

| Phase | Status |
|-------|--------|
| Phase 1 — Foundation | ✅ Complete |
| Phase 2 — Dashboard | ✅ Complete (mobile-responsive) |
| Phase 3 — SMS Automations | 🔄 Built, pending verification |
| Phase 4 — Public landing + booking | ✅ Complete (+ password recovery + public booking) |
| Phase 4.5 — Admin dashboard | ✅ Complete (`/admin` — tenant management) |
| Phase 5 — Deploy | 🔄 In progress — `barberqueue.pro` registered, DNS done, env vars done |

> Phase 5 does NOT require Phase 3 — SMS routes fail gracefully (`status: 'failed'` in DB) until Twilio is fully verified.

---

## Phase 1 — Foundation ✅

- Next.js 16 + TypeScript + Tailwind + shadcn/ui
- `proxy.ts` middleware — subdomain routing, auth guard, `x-subdomain` header
- Full SQL schema with RLS and triggers
- Supabase clients (browser / server / admin)
- Magic link auth (PKCE) + email/password login + password recovery (`/forgot-password`, `/reset-password`)
- English schema migration applied (2026-05-16)
- Subdomain routing finalized — in-app links use subdomain-root paths; dev uses real subdomains (`test.localhost:3000`), no fallback

---

## Phase 2 — Dashboard ✅

- Layout with sidebar (`getTenant()` via `React.cache()`)
- Mobile-responsive — sidebar drawer + card layouts for tables (primary users are on phones)
- Stats + today's appointments
- `AppointmentsTodayTable` — Complete + No show buttons (optimistic UI)
- `POST /api/appointments/complete` → RPC `complete_appointment` (atomic)
- `lib/loyalty.ts` — shared level logic
- Client list with search + client detail (visit history, SMS history)
- `POST /api/reviews/request`

---

## Phase 3 — SMS Automations 🔄

### 3.1 — Infrastructure ✅ Complete
- [x] Twilio number (`+1 249 421 1641`) + Account SID + Auth Token → `.env`
- [x] Twilio Console messaging webhook → `https://barberqueue.pro/api/webhooks/twilio`
- [x] n8n on Railway → `N8N_BASE_URL` + `N8N_API_KEY` in `.env`
- [x] `WEBHOOK_SECRET` (`openssl rand -hex 32`) → `.env` + n8n Bearer Auth credential
- [x] `RESEND_API_KEY` + `OPENROUTER_API_KEY` → `.env`
- [x] `POST /api/webhooks/twilio` — inbound SMS → persist to `messages` → trigger n8n
- [ ] `N8N_REVIEW_WEBHOOK_URL` + `N8N_AUTOREPLY_WEBHOOK_URL` → `.env` (Production URLs from n8n)

### 3.2 — API routes ✅ Complete
- `POST /api/noshow` — mark no-show, increment counter, recovery SMS
- `POST /api/clients/reactivate` — detect inactive clients, personalized SMS (single tenant)
- `POST /api/cron/reactivate` — reactivation SMS + Resend email across all tenants (weekly cron)
- `POST /api/reviews/request` — Google review SMS
- `POST /api/messages/send` — send arbitrary SMS (used by the AI auto-reply workflow)
- Cookie/session routes also accept `Bearer {WEBHOOK_SECRET}` (n8n); `cron` + `messages` are webhook-only

### 3.3 — n8n workflows 🔄 Built, pending verification
Three workflows built on the Railway n8n instance:
- `01 · Review Request` — webhook → wait 30 min → `POST /api/reviews/request`
- `02 · Weekly Reactivation Cron` — schedule (Mon 9am) → `POST /api/cron/reactivate`
  - SMS always sent (uses `clients.phone`); email only if `clients.email` is set (non-fatal if missing)
  - Email via Resend HTTP API; subject: re-engagement with 10% discount offer
- `03 · AI Auto-Reply` — see 3.4
- HTTP Request nodes authenticate via an n8n Bearer Auth credential (not `$env` — blocked by n8n)
- ⚠️ `n8n/*.json` files are stale — live n8n instance is authoritative until re-exported

### 3.4 — AI auto-reply 🔄 Built, pending verification
- Workflow `03 · AI Auto-Reply`: inbound SMS → `/api/webhooks/twilio` → n8n webhook → native **AI Agent** node → `POST /api/messages/send`
- AI Agent uses an **OpenRouter Chat Model** sub-node + **Simple Memory** (session keyed by `from_number`)
- Model selectable in the OpenRouter Chat Model node (e.g. `anthropic/claude-3.5-haiku`)
- n8n webhook receives the `/api/webhooks/twilio` payload under `$json.body.*` (`message`, `from_number`, `subdomain`, …)

---

## Phase 4 — Public landing + booking ✅

### 4.1 — Landing + onboarding
- Landing page — hero, features, pricing, CTAs
- `/register` — shop name, slug with real-time availability check, email
- `GET /api/register/check-slug` — format + reserved words + DB check
- Onboarding: magic link with `?shop=...&slug=...` → callback creates tenant → redirect to dashboard
- Race condition handled: slug taken between check and confirm → `/register?error=slug-taken`
- Password recovery — `/forgot-password` → `resetPasswordForEmail` → callback → `/reset-password`
- Legal pages — `/privacy`, `/terms`, `/refund` (shared `(legal)` layout)

### 4.2 — Public client booking
- Public booking page at `[slug].barberqueue.pro/book` — no sign-in, mobile-first
- `BookingLinkCard` on the dashboard — copy-to-clipboard widget for the shop's booking URL
- Slot picker uses `GET /api/book/slots?date=YYYY-MM-DD` to hide occupied times in real time
- `POST /api/book` — creates client (or reuses by phone), inserts appointment, sends confirmation SMS
- Validation server-side: name 2–80 chars, phone normalized to E.164, service ≤80, date ≥ today (Toronto TZ), time on 30-min grid, not in the past
- Rate limits: 10 bookings/min per shop + 3 bookings/day per existing phone
- Suspended shops (`plan = 'suspended'`) reject new bookings at the page and the API
- Partial unique index `appointments_unique_active_slot (tenant_id, date, time) WHERE status IN ('pending','completed')` — prevents double-booking under concurrent submits; cancelled/no-show free the slot back up
- `lib/dates.ts` — `todayInToronto()`, `isPastInToronto()`, `formatDateTimeForSms()`, `addDaysISO()` — server runs UTC on Vercel but the product is Toronto-local
- `UpcomingBookings` card on the dashboard — owner cancels via `POST /api/appointments/cancel`, courtesy SMS sent, slot freed

---

## Phase 4.5 — Admin dashboard ✅

Platform-owner panel at `barberqueue.pro/admin` for managing tenants without touching SQL.

- `lib/admin.ts` — `isAdmin(userId)` reads the `ADMIN_USER_IDS` env allowlist
- `app/admin/layout.tsx` — server-side guard: `redirect('/login?next=/admin')` for unauthed, `notFound()` for non-admins (URL doesn't leak)
- `app/admin/page.tsx` — server component; joins tenants with `auth.admin.listUsers()` for owner emails; per-tenant parallel `COUNT(*)` for clients / appointments / outbound SMS
- `components/admin/TenantsTable.tsx` — client component with optimistic UI, inline twilio_number edit, plan dropdown, `router.refresh()` after each save
- `POST /api/admin/tenants/[id]/twilio` — E.164 validation (`^\+\d{11,15}$`), strips spaces/dashes/parens, accepts null to clear
- `POST /api/admin/tenants/[id]/plan` — enum-validated against `trial | active | suspended`
- Both APIs re-check `isAdmin(user.id)` — never trust the layout guard alone
- Login supports `?next=/path` — admins without a tenant skip the default tenant-redirect to `/register`

---

## Phase 5 — Deploy 🔄 In progress

> Domain `barberqueue.pro` is registered, DNS propagated, env vars set. Remaining work is the external services + final cleanups.

- [x] Register `barberqueue.pro`
- [x] Connect repo to Vercel (auto-deploys on push to `main`)
- [x] Environment variables in Vercel Dashboard
- [x] Wildcard DNS (`*.barberqueue.pro → CNAME Vercel`) + domain in Vercel → Settings → Domains
- [x] Delete the `test` tenant + sample data from Supabase
- [x] Remove dev subdomain fallback in `lib/subdomain.ts`
- [x] n8n on Railway (done in Phase 3.1)
- [ ] `ADMIN_USER_IDS` env var in Vercel (production scope) — required for `/admin` access
- [ ] Update Supabase Auth URLs (site URL + redirect allowlist) for `barberqueue.pro`
- [ ] Twilio Console webhook → `https://barberqueue.pro/api/webhooks/twilio`
- [ ] n8n workflows pointing to production app URL
- [ ] Resend sender domain verified (`noreply@barberqueue.pro`)

---

## Project structure

```
barberdesk/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx               # Magic link + password login
│   │   ├── register/page.tsx            # New barbershop registration
│   │   ├── forgot-password/page.tsx     # Request a password reset email
│   │   └── reset-password/page.tsx      # Set a new password
│   ├── auth/callback/route.ts           # PKCE callback — session + tenant creation
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # Stats + today's appointments
│   │   └── clients/
│   │       ├── page.tsx                 # Client list with search
│   │       └── [id]/page.tsx            # Client detail
│   ├── (legal)/
│   │   ├── layout.tsx                   # Shared legal layout
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   └── refund/page.tsx
│   ├── book/
│   │   ├── page.tsx                     # Public booking page (no sign-in)
│   │   ├── BookingForm.tsx              # Client component — name/phone/service/date/time
│   │   └── confirmed/page.tsx           # Post-booking confirmation
│   ├── api/
│   │   ├── appointments/complete/route.ts
│   │   ├── appointments/cancel/route.ts
│   │   ├── book/route.ts                # Public booking — rate-limited + admin client
│   │   ├── book/slots/route.ts          # Returns taken times for a given date
│   │   ├── noshow/route.ts
│   │   ├── clients/reactivate/route.ts
│   │   ├── cron/reactivate/route.ts
│   │   ├── messages/send/route.ts
│   │   ├── reviews/request/route.ts
│   │   ├── webhooks/twilio/route.ts
│   │   └── register/check-slug/route.ts
│   ├── page.tsx                         # Public landing
│   └── layout.tsx
├── components/
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── SidebarNav.tsx
│   │   ├── AppointmentsTodayTable.tsx
│   │   ├── BookingLinkCard.tsx          # Copy-to-clipboard for the public booking URL
│   │   └── UpcomingBookings.tsx         # Owner-side cancel of self-bookings
│   └── clients/ClientsTable.tsx
├── lib/
│   ├── supabase/ (client, server, admin, types)
│   ├── session.ts       # getTenant() with React.cache()
│   ├── loyalty.ts       # POINTS_PER_VISIT, calculateLevel
│   ├── slug.ts          # validateSlug(), RESERVED_SUBDOMAINS
│   ├── subdomain.ts     # getSubdomain(), SUPABASE_COOKIE_OPTIONS
│   ├── dates.ts         # Toronto-TZ helpers — todayInToronto, isPastInToronto, …
│   └── twilio.ts        # sendSms() — REST client
├── proxy.ts             # Next.js 16 middleware
├── n8n/                 # Workflow JSON exports (01 review, 02 cron, 03 AI auto-reply)
└── supabase/migrations/
```

---

## Technical decisions

| Decision | Reason |
|----------|--------|
| `proxy.ts` skips `/auth/` paths | `getUser()` in middleware wipes PKCE code-verifier cookie |
| `client.ts` inlines cookie options | Importing `subdomain.ts` pulls `next/headers` into browser bundle |
| `complete_appointment` as RPC | 4 writes are atomic — no partial state on failure |
| `React.cache()` in `getTenant()` | Deduplicates DB queries between layout and page in same request |
| `user_owns_tenant(uuid)` in RLS | Supports multiple tenants per owner; `get_tenant_id()` broke silently |
| SMS routes return 502 on failure | n8n retries automatically; message always persisted to DB |
| Dual auth in SMS routes | Browser uses session cookie; n8n uses Bearer secret |
| Slug re-validated in callback | Magic link params can be tampered — re-run `validateSlug()` before INSERT |
| n8n uses Credentials, not `$env` | n8n blocks env-var access in expressions; secrets live in n8n credentials |
| AI auto-reply via native AI Agent | OpenRouter Chat Model + Simple Memory sub-nodes — no custom HTTP Request node |
| In-app links use subdomain-root paths | proxy rewrites `/*` → `/dashboard/*` on subdomains; linking to `/dashboard/*` would 404 |
| `/book` + `/api/book/*` are public paths in `proxy.ts` | Customers must reach the booking flow without a session, but still need `x-subdomain` injected |
| Public booking uses `createAdminClient()` | Anonymous visitors can't satisfy RLS — admin client is safe because the route only writes scoped to a validated tenant + has rate limits |
| Partial unique index on active appointments | Concurrent submits at the same slot would otherwise both succeed; cancelled/no_show must free the slot back up |
| All datetime logic goes through `lib/dates.ts` | Vercel runs UTC but the product is Toronto-local — same-day "today" queries break silently without a TZ-aware helper |
| Suspended tenants reject public bookings | Otherwise we'd burn SMS credit for an unpaid account |
