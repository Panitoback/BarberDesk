# Roadmap — BarberPro

## General status (2026-05-16)

| Phase | Status | Blocked by |
|-------|--------|------------|
| Phase 1 — Foundation | ✅ Complete | — |
| Phase 2 — Dashboard | ✅ Complete | — |
| Phase 3 — SMS Automations | 🔄 In progress | Twilio credentials + n8n on Railway |
| Phase 4 — Public landing | ✅ Complete | — |
| Phase 5 — Deploy and production | 🔲 Pending | Phase 3 is not a blocker (see note below) |

> **Order note:** Phases 4 and part of 5 were completed before Phase 3.
> This is intentional — all the code is ready, only external credentials are missing (Twilio, n8n, Railway).
> Deploying to Vercel can be done before finishing Phase 3.
> SMS routes fail gracefully (log to DB with `status: 'failed'`) until credentials are configured.

---

## Current project structure

```
barberdesk/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx                    # Magic link login
│   │   └── register/page.tsx                 # New barbershop registration (slug + name + email)
│   ├── auth/
│   │   └── callback/route.ts                 # PKCE callback — creates session + tenant on new registration
│   ├── dashboard/
│   │   ├── layout.tsx                        # Layout with sidebar
│   │   ├── page.tsx                          # Stats + today's appointments
│   │   └── clients/
│   │       ├── page.tsx                      # Client list with search
│   │       └── [id]/page.tsx                 # Detail: stats, visits, SMS
│   ├── api/
│   │   ├── appointments/
│   │   │   └── complete/route.ts             # POST /api/appointments/complete
│   │   ├── noshow/route.ts                   # POST /api/noshow (Phase 3.2 ✅)
│   │   ├── reviews/
│   │   │   └── request/route.ts              # POST /api/reviews/request (Phase 2 ✅)
│   │   ├── clients/
│   │   │   └── reactivate/route.ts           # POST /api/clients/reactivate (Phase 3.2 ✅)
│   │   ├── register/
│   │   │   └── check-slug/route.ts           # GET /api/register/check-slug (Phase 4 ✅)
│   │   └── webhooks/
│   │       └── twilio/route.ts               # POST /api/webhooks/twilio (Phase 3.1 🔲)
│   ├── page.tsx                              # Public landing (Phase 4 ✅)
│   └── layout.tsx                            # Root layout
├── components/
│   ├── ui/                                   # shadcn/ui
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── SidebarNav.tsx                    # Sidebar with active state + "Soon" items
│   │   └── AppointmentsTodayTable.tsx        # Appointments table + Complete button
│   └── clients/
│       └── ClientsTable.tsx                  # List with real-time search
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── admin.ts
│   │   └── types.ts                          # Generated types + complete_appointment added manually
│   ├── session.ts                            # getTenant() with React.cache()
│   ├── loyalty.ts                            # POINTS_PER_VISIT, calculateLevel
│   ├── slug.ts                               # SLUG_RE, RESERVED_SUBDOMAINS, validateSlug()
│   ├── subdomain.ts                          # extractSubdomainFromHost(), getSubdomain(), SUPABASE_COOKIE_OPTIONS
│   └── twilio.ts                             # sendSms() — REST client without SDK
├── proxy.ts                                  # Next.js 16 middleware — subdomain routing
└── supabase/
    └── migrations/
        ├── 20260419044041_initial_schema.sql
        ├── 20260421000000_complete_appointment_fn.sql
        ├── 20260422000000_citas_table.sql
        ├── 20260422120000_harden_rls_multi_tenant.sql
        └── 20260516000000_english_schema.sql
```

---

## Phase 1 — Foundation ✅

- [x] Next.js 16 + TypeScript + Tailwind + shadcn/ui
- [x] `proxy.ts` — subdomain middleware, auth guard, `x-subdomain` header
- [x] Full SQL schema with RLS and triggers
- [x] Supabase clients (browser + server + admin)
- [x] Magic link login — dynamic `getBaseOrigin()`, functional PKCE flow
- [x] TypeScript types generated from Supabase
- [x] English schema migration applied (2026-05-16)

---

## Phase 2 — Barber dashboard ✅

- [x] Layout with sidebar (`getTenant()` shared via `React.cache()`)
- [x] Dashboard: stats + today's appointments
- [x] `AppointmentsTodayTable` — Complete button with optimistic state
- [x] `POST /api/appointments/complete` → RPC `complete_appointment` (atomic transaction)
- [x] `lib/loyalty.ts` — shared level logic
- [x] Client view: list with search + detail with history and SMS
- [x] `POST /api/reviews/request` — review SMS with fallback

---

## Phase 3 — SMS Automations 🔄

### 3.1 — Base infrastructure ⛔ Pending (requires credentials)

- [ ] Get Twilio number + Account SID + Auth Token → fill in `.env`
- [ ] Deploy n8n on Railway → get `N8N_BASE_URL` + `N8N_API_KEY`
- [ ] Generate `WEBHOOK_SECRET` (`openssl rand -hex 32`) → fill in `.env` and n8n
- [ ] `POST /api/webhooks/twilio` — receives inbound SMS, persists to `messages`

### 3.2 — Backend API routes ✅ Complete (2026-04-22)

- [x] `POST /api/noshow` — marks appointment as no-show, increments counter, SMS from template
- [x] `POST /api/clients/reactivate` — detects inactive clients, filters already-contacted, sends personalized SMS
- [x] Both routes accept `Authorization: Bearer {WEBHOOK_SECRET}` (n8n) or session cookie

### 3.3 — n8n workflows ⛔ Pending (requires 3.1)

- [ ] Workflow 1: No-show — SMS from barber → n8n confirms → `POST /api/noshow`
- [ ] Workflow 2: Loyalty — post completed appointment → notifies if client leveled up
- [ ] Workflow 3: Reactivation — weekly cron → `POST /api/clients/reactivate`
- [ ] Workflow 4: Reviews — post-appointment trigger → 30 min delay → `POST /api/reviews/request`

### 3.4 — AI auto-reply ⛔ Pending (requires 3.1 + Anthropic key)

- [ ] `lib/anthropic.ts` — Claude API client (claude-sonnet-4-6)
- [ ] Workflow 5: inbound SMS → n8n → Claude with barbershop context → automated response

### Phase 3 sync with Phases 4 and 5

When 3.1 + 3.3 are complete, verify these integration points:

| Point | What to verify |
|-------|----------------|
| New barber registration (Phase 4) | Tenant is created without `twilio_number`. After 3.1, add the assigned number from the dashboard or Supabase. |
| Twilio webhook | Configure in Twilio Console: `POST https://barberpro.ca/api/webhooks/twilio` |
| n8n → API routes | n8n must send `Authorization: Bearer {WEBHOOK_SECRET}` and the tenant's subdomain in the `x-subdomain` header. |
| Reviews (Phase 2 + Phase 3) | `POST /api/reviews/request` is already implemented. Workflow 4 just needs to point to that URL. |
| Vercel variables | When deploying (Phase 5), fill all `.env` variables in Vercel Dashboard. |

---

## Phase 4 — Public landing ✅

- [x] Landing page — hero, features, pricing, CTAs → `/register`
- [x] `/register` — form with shop name, slug with real-time availability check, email
- [x] `GET /api/register/check-slug` — validates format, reserved words, and DB availability
- [x] Onboarding flow: magic link carries `?shop=...&slug=...` → callback creates tenant → redirect to `[slug].barberpro.ca/dashboard`
- [x] Race condition handling: if slug is taken between check and confirmation → `/register?error=slug-taken`

---

## Phase 5 — Deploy and production 🔲

> This phase can start **before** Phase 3 is complete.
> The app works without SMS — automation routes fail gracefully and log to DB.

- [ ] Deploy to Vercel
  - [ ] Connect repo → configure build settings
  - [ ] Environment variables in Vercel (Supabase URL/keys available now, rest when credentials arrive)
  - [ ] Verify `proxy.ts` works as middleware on Vercel
- [ ] Domain `barberpro.ca` + wildcard DNS (`*.barberpro.ca → CNAME to Vercel`)
  - [ ] Automatic SSL via Vercel (included)
  - [ ] Configure wildcard in Vercel Dashboard → Settings → Domains
- [ ] Supabase in production — already set up (project `gjefeiwsvcjroklvkbuk`)
- [ ] n8n on Railway (production) — part of Phase 3.1
- [ ] E2E tests with Playwright (critical flow: registration → login → appointment → Complete)
- [ ] Remove technical debt before go-live (see CLAUDE.md)

---

## Technical decisions

| Decision | Reason |
|---|---|
| `proxy.ts` instead of `middleware.ts` | Next.js 16 renamed the convention — export is `proxy`, not `middleware` |
| `complete_appointment` as Postgres RPC | All 4 writes are atomic — no risk of inconsistent data if it fails mid-way |
| `React.cache()` in `lib/session.ts` | Deduplicates auth+tenant queries between layout and page within the same request |
| SMS error handling with fallback | SMS routes never crash — they catch the error, persist `status: 'failed'` to DB, and return 502 for n8n to retry |
| Dual auth in automation routes | `Authorization: Bearer {WEBHOOK_SECRET}` for n8n + session cookie for browser — same endpoint, two callers |
| Onboarding via query params in redirectTo | Passing `?shop=...&slug=...` in the magic link avoids needing a temp table or sessionStorage — data travels with the PKCE flow |
| Phase 4 before Phase 3 | SMS routes already have the correct fallback — landing and registration work without SMS credentials |
| Full English codebase | Single language across all code, DB, comments, and UI. No exceptions. |
