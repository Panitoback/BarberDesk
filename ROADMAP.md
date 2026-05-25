# Roadmap — BarberQueue

## Status (2026-05-25)

| Phase | Status |
|-------|--------|
| Phase 1 — Foundation | ✅ Complete |
| Phase 2 — Dashboard | ✅ Complete (mobile-responsive) |
| Phase 3.1 — Twilio + n8n infra | ✅ Complete |
| Phase 3.2 — SMS API routes | ✅ Complete |
| Phase 3.3 — n8n workflow 01 (review delay) | ✅ Verified end-to-end |
| Phase 3.3 — n8n workflow 02 (reactivation cron) | ✅ Verified end-to-end (SMS + email) |
| Phase 3.4 — n8n workflow 03 (AI auto-reply) | ⚠️ End-to-end works; needs re-verify with new `shop_data` grounding |
| Phase 4 — Public landing + booking | ✅ Complete (+ password recovery + public booking) |
| Phase 4.5 — Admin dashboard | ✅ Complete (`/admin` — tenant management) |
| Phase 4.6 — Shop settings | ✅ Complete (`/settings` — hours, services, address, Google review link → AI grounding) |
| Phase 4.7 — Automations dashboard | ✅ Complete 2026-05-25 (`/automations` — 4 toggles + reactivation days; loyalty toggle enforced in RPC) |
| Phase 4.8 — Dynamic services + revenue tracking | ✅ Complete 2026-05-25 (booking dropdown reads `tenant.config.services`; `appointments.price` → `visits.price`) — **pending push** |
| Phase 5 — Deploy | ✅ Live at `barberqueue.pro` — all external services configured |

> Workflow 03 needs one more end-to-end pass after the owner fills `/settings` and the n8n System Message is updated to read `$json.body.shop_data`. The hallucination problem (invented hours/prices) is fixed at the data layer; the prompt change is the last piece.

> **Next session pickup point:** Phase 4.8 is built and the migration is applied in Supabase, but the code is still local. First action tomorrow is the `git add` / `commit` / `push` for the booking + revenue changes (see commands in `CLAUDE.md` → "Pending for next session").

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

### 3.3 — n8n workflows
Three workflows on the Railway n8n instance:
- `01 · Review Request` — webhook → wait 30 min → `POST /api/reviews/request` — ✅ **Verified 2026-05-23**
- `02 · Weekly Reactivation Cron` — schedule (Mon 9am) → `POST /api/cron/reactivate` — ✅ **Verified 2026-05-24**
  - SMS always sent (uses `clients.phone`); email only if `clients.email` is set (non-fatal if missing)
  - Email via Resend HTTP API; subject: re-engagement with 10% discount offer
- `03 · AI Auto-Reply` — see 3.4 — 🔄 pending verify
- HTTP Request nodes authenticate via an n8n Bearer Auth credential (not `$env` — blocked by n8n)
- ⚠️ `n8n/*.json` files are stale — live n8n instance is authoritative until re-exported

### 3.4 — AI auto-reply ⚠️ End-to-end works, needs re-verify with new prompt
- Workflow `03 · AI Auto-Reply`: inbound SMS → `/api/webhooks/twilio` → n8n webhook → native **AI Agent** node → `POST /api/messages/send`
- AI Agent uses an **OpenRouter Chat Model** sub-node + **Simple Memory** (session keyed by `from_number`)
- Model selectable in the OpenRouter Chat Model node (e.g. `anthropic/claude-3.5-haiku`, `openai/gpt-4.1-mini`)
- n8n webhook receives the `/api/webhooks/twilio` payload under `$json.body.*` (`message`, `from_number`, `subdomain`, `shop_name`, `shop_data`, `client_name`)
- **`shop_data` is the AI's source of truth** — populated from `tenants.config` (filled by owner at `/settings`). The system message must instruct the AI to use ONLY `shop_data` for hours/services/prices and say "I can't confirm" for anything else. Without this grounding the model hallucinates (e.g. inventing a 10am opening time)
- **Vercel runtime fix:** the `/api/webhooks/twilio` fetch to n8n is wrapped in `after()` from `next/server` — without it Vercel kills the fire-and-forget promise before the request reaches n8n, causing intermittent auto-reply failures

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
- `POST /api/book` — creates client (or reuses by phone), inserts appointment with price snapshot, sends confirmation SMS
- Service dropdown is rendered from `tenant.config.services` (max 30 entries), each option labelled `Name · $price`. Shops with no services configured see "Online booking is not available yet" instead of the form — no hardcoded fallback list (the old `DEFAULT_SERVICES` array is gone). API also re-validates the chosen service against the config and rejects unknown names with 400
- Validation server-side: name 2–80 chars, phone normalized to E.164, service must match a configured entry, date ≥ today (Toronto TZ), time on 30-min grid, not in the past
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

## Phase 4.6 — Shop settings ✅

Owner-facing settings page that grounds the AI auto-reply with verified shop data.

- `lib/tenant-config.ts` — `TenantConfig` type + `validateTenantConfig()`: whitelists `hours`, `services`, `address`; regex-checks times (`HH:MM`), bounds-checks prices (0–10000 CAD), caps services list at 30
- `app/dashboard/settings/page.tsx` — server component, loads `tenants.config` AND `automations_config.review_link` in parallel via RLS, coerces unknown JSON safely
- `components/dashboard/SettingsForm.tsx` — client form, mobile-first: stacked rows on `<sm`, `min-h-[40px]` inputs, `min-h-[44px]` save button, `inputMode="decimal"` on prices, `aria-label` on every field, feedback via `role="status"`. Hours, services, address, and Google review link are all on the same form
- `POST /api/settings` — owner-scoped via RLS, accepts `{ config, review_link }`; validates+sanitizes before writing `tenants.config` (jsonb) AND `automations_config.review_link` in the same save
- `SidebarNav` — Settings moved from "Coming Soon" to active nav (icon already imported)
- `/api/webhooks/twilio` — selects `config` and forwards as `shop_data` in the n8n payload, so the AI Agent's system prompt can `JSON.stringify($json.body.shop_data)` and ground its replies in real values
- Empty fields = AI says "I can't confirm" (system prompt is explicit about NEVER inventing data). This is intentional — onboarding has zero friction; owners fill what they want

---

## Phase 4.7 — Automations dashboard ✅

Owner-facing control panel for the SMS automations, served at `[slug].barberqueue.pro/automations`.

- `app/dashboard/automations/page.tsx` — server component, loads `automations_config` row via RLS, falls back to all-true defaults if the row is missing (legacy tenants pre-trigger)
- `components/dashboard/AutomationsForm.tsx` — 4 cards with toggles (No-show recovery / Loyalty points / Review request / Win-back inactive clients) + a `reactivation_days` numeric input that only renders when win-back is active
- `POST /api/automations` — partial update; ignores fields not in the payload, validates each toggle as boolean and `reactivation_days` as integer 7–365
- `SidebarNav` — new "Automations" nav item (Zap icon) between Clients and Settings
- Wiring already existed for the other three automations (`/api/noshow`, `/api/reviews/request`, `/api/cron/reactivate` all read their respective `*_active` flag); the loyalty toggle was the one missing piece — added to the `complete_appointment` RPC via migration `20260525000000`
- The Google review URL was deliberately kept out of this page: per-tenant static info belongs in `/settings` alongside address/hours, even though the storage lives in `automations_config.review_link`

---

## Phase 4.8 — Dynamic services + revenue tracking ✅ (pending push)

Closes two pieces of tech debt that surfaced once owners started entering services with prices in `/settings`.

- Migration `20260525010000`: `appointments.price numeric NULL` + `complete_appointment` carries `appointments.price` into `visits.price`
- `lib/supabase/types.ts` updated by hand to include the new column (regen would lose the manual `complete_appointment` / `user_owns_tenant` additions)
- `/api/book` looks up the chosen service in `tenant.config.services`, snapshots the canonical `price_cad` onto the appointment, and rejects services that don't exist in the config (400) or shops with no services configured (409)
- `app/book/page.tsx` removed the hardcoded `DEFAULT_SERVICES` array; if the shop hasn't filled `/settings → Services` the page shows "Online booking is not available yet" instead of a broken form
- `app/book/BookingForm.tsx` — service options render as `Name · $price` (e.g. `Classic Haircut · $40`, `Beard Trim · $14.99`); integer prices drop the trailing `.00`
- Dashboard's "Revenue this month" card already summed `visits.price` — once Phase 4.8 ships, those values stop being NULL and the card starts reflecting reality

---

## Phase 5 — Deploy ✅ Live

> `barberqueue.pro` is live. All external services configured. Remaining: workflow verification + pre-launch cleanup.

- [x] Register `barberqueue.pro`
- [x] Connect repo to Vercel (auto-deploys on push to `main`)
- [x] Environment variables in Vercel Dashboard
- [x] Wildcard DNS (`*.barberqueue.pro → CNAME Vercel`) + domain in Vercel → Settings → Domains
- [x] Remove dev subdomain fallback in `lib/subdomain.ts`
- [x] n8n on Railway (done in Phase 3.1)
- [x] `ADMIN_USER_IDS` env var in Vercel — `/admin` accessible at `barberqueue.pro/admin`
- [x] Supabase Auth URLs — site URL `https://barberqueue.pro` + redirect allowlist including `https://*.barberqueue.pro/auth/callback`
- [x] Twilio Console webhook → `https://barberqueue.pro/api/webhooks/twilio`
- [x] n8n workflows pointing to `barberqueue.pro` (updated from old `barberpro.ca` URL)
- [x] Resend sender domain verified (`noreply@barberqueue.pro`) — DNS records in Vercel nameservers
- [x] Verify n8n workflow 02 (reactivation cron) end-to-end — 2026-05-24
- [ ] Verify n8n workflow 03 (AI auto-reply) end-to-end
- [ ] Upgrade Twilio from trial (removes message length limit + verified-number restriction)
- [ ] Delete test tenant (FadeKingbarbershop) + data before real launch

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
│   │   ├── clients/
│   │   │   ├── page.tsx                 # Client list with search
│   │   │   └── [id]/page.tsx            # Client detail
│   │   ├── settings/page.tsx            # Shop settings (hours, services, address, Google review link)
│   │   └── automations/page.tsx         # Automations control panel (4 toggles + reactivation days)
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
│   │   ├── settings/route.ts            # Owner saves shop config (hours/services/address) + review_link
│   │   ├── automations/route.ts         # Owner toggles SMS automations + reactivation_days
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
│   │   ├── UpcomingBookings.tsx         # Owner-side cancel of self-bookings
│   │   ├── SettingsForm.tsx             # Client form for hours/services/address/review_link (mobile-first)
│   │   └── AutomationsForm.tsx          # Toggle cards for the 4 SMS automations + reactivation days
│   └── clients/ClientsTable.tsx
├── lib/
│   ├── supabase/ (client, server, admin, types)
│   ├── session.ts       # getTenant() with React.cache()
│   ├── loyalty.ts       # POINTS_PER_VISIT, calculateLevel
│   ├── slug.ts          # validateSlug(), RESERVED_SUBDOMAINS
│   ├── subdomain.ts     # getSubdomain(), SUPABASE_COOKIE_OPTIONS
│   ├── dates.ts         # Toronto-TZ helpers — todayInToronto, isPastInToronto, …
│   ├── twilio.ts        # sendSms() — REST client
│   └── tenant-config.ts # TenantConfig type + validator for tenants.config (jsonb)
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
| `after()` from `next/server` wraps the n8n fan-out in `/api/webhooks/twilio` | Vercel kills fire-and-forget promises when the function returns; without `after()` the n8n call was dropped mid-flight on cold starts, causing intermittent AI auto-reply failures |
| Shop data lives in `tenants.config` JSONB (Option A) | Zero new migrations, evolves freely as the AI grows; whitelisted via `validateTenantConfig` so the column can't be polluted from the API. Option B (dedicated tables for `business_hours`/`services`) is the natural next step once the UI needs CRUD per row |
| Empty/missing fields in `tenants.config` are valid | Onboarding has zero friction. The AI's system message turns "no data" into "I can't confirm" — it's safer than forcing the owner to fill everything before activation |
| `loyalty_active` enforced inside `complete_appointment` RPC | Points accrual is server-only; without the check the toggle would be a lie. RPC reads the flag, still records the visit (price + service) on OFF so revenue and history are unaffected. |
| `appointments.price` captured at booking, not at completion | The customer agrees to a price when they book; the shop can change prices in `/settings` later and existing bookings keep their original quote. RPC carries it into `visits.price` so revenue math reflects what was actually charged. |
| No hardcoded fallback service list on `/book` | Letting customers book with default services creates fake revenue ($0 visits, mismatched names). Forcing the owner to fill `/settings` first keeps revenue tracking honest and signals when a shop isn't actually open for online bookings yet. |
| Google review URL lives in `automations_config` but is edited in `/settings` | Storage is co-located with the SMS code that reads it; the UI is co-located with the other "static shop info" (hours, address). `/api/settings` writes both tables in one save. |
