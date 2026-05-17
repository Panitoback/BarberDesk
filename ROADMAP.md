# Roadmap — BarberPro

## Status (2026-05-17)

| Phase | Status |
|-------|--------|
| Phase 1 — Foundation | ✅ Complete |
| Phase 2 — Dashboard | ✅ Complete |
| Phase 3 — SMS Automations | 🔄 In progress |
| Phase 4 — Public landing | ✅ Complete |
| Phase 5 — Deploy | 🔲 Pending |

> Phase 5 does NOT require Phase 3 — SMS routes fail gracefully (`status: 'failed'` in DB) until Twilio credentials arrive.

---

## Phase 1 — Foundation ✅

- Next.js 16 + TypeScript + Tailwind + shadcn/ui
- `proxy.ts` middleware — subdomain routing, auth guard, `x-subdomain` header
- Full SQL schema with RLS and triggers
- Supabase clients (browser / server / admin)
- Magic link auth (PKCE) + email/password login option
- English schema migration applied (2026-05-16)

---

## Phase 2 — Dashboard ✅

- Layout with sidebar (`getTenant()` via `React.cache()`)
- Stats + today's appointments
- `AppointmentsTodayTable` — Complete button (optimistic UI)
- `POST /api/appointments/complete` → RPC `complete_appointment` (atomic)
- `lib/loyalty.ts` — shared level logic
- Client list with search + client detail (visit history, SMS history)
- `POST /api/reviews/request`

---

## Phase 3 — SMS Automations 🔄

### 3.1 — Infrastructure ⛔ Blocked
- [ ] Twilio number + Account SID + Auth Token → fill `.env`
- [ ] n8n on Railway → get `N8N_BASE_URL` + `N8N_API_KEY`
- [ ] `WEBHOOK_SECRET` (`openssl rand -hex 32`) → `.env` + n8n
- [ ] `POST /api/webhooks/twilio` — inbound SMS → persist to `messages`

### 3.2 — API routes ✅ Complete
- `POST /api/noshow` — mark no-show, increment counter, recovery SMS
- `POST /api/clients/reactivate` — detect inactive clients, send personalized SMS
- `POST /api/reviews/request` — Google review SMS
- All accept session cookie (browser) or `Bearer {WEBHOOK_SECRET}` (n8n)

### 3.3 — n8n workflows ⛔ Blocked (needs 3.1)
- Workflow 1: no-show SMS trigger
- Workflow 2: loyalty level-up notification
- Workflow 3: weekly reactivation cron
- Workflow 4: post-appointment review request (30 min delay)

### 3.4 — AI auto-reply ⛔ Blocked (needs 3.1 + Anthropic key)
- `lib/anthropic.ts` — Claude API client
- Workflow 5: inbound SMS → Claude with barbershop context → automated reply

---

## Phase 4 — Public landing ✅

- Landing page — hero, features, pricing, CTAs
- `/register` — shop name, slug with real-time availability check, email
- `GET /api/register/check-slug` — format + reserved words + DB check
- Onboarding: magic link with `?shop=...&slug=...` → callback creates tenant → redirect to dashboard
- Race condition handled: slug taken between check and confirm → `/register?error=slug-taken`

---

## Phase 5 — Deploy 🔲

- [ ] Connect repo to Vercel (auto-deploys on push to `main`)
- [ ] Environment variables in Vercel Dashboard
- [ ] Domain `barberpro.ca` + wildcard DNS (`*.barberpro.ca → CNAME Vercel`)
- [ ] Remove dev subdomain fallback in `lib/subdomain.ts`
- [ ] Delete test rows from `tenants` table
- [ ] n8n on Railway (part of Phase 3.1)

---

## Project structure

```
barberdesk/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx               # Magic link + password login
│   │   └── register/page.tsx            # New barbershop registration
│   ├── auth/callback/route.ts           # PKCE callback — session + tenant creation
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # Stats + today's appointments
│   │   └── clients/
│   │       ├── page.tsx                 # Client list with search
│   │       └── [id]/page.tsx            # Client detail
│   ├── api/
│   │   ├── appointments/complete/route.ts
│   │   ├── noshow/route.ts
│   │   ├── clients/reactivate/route.ts
│   │   ├── reviews/request/route.ts
│   │   └── register/check-slug/route.ts
│   ├── page.tsx                         # Public landing
│   └── layout.tsx
├── components/
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── SidebarNav.tsx
│   │   └── AppointmentsTodayTable.tsx
│   └── clients/ClientsTable.tsx
├── lib/
│   ├── supabase/ (client, server, admin, types)
│   ├── session.ts       # getTenant() with React.cache()
│   ├── loyalty.ts       # POINTS_PER_VISIT, calculateLevel
│   ├── slug.ts          # validateSlug(), RESERVED_SUBDOMAINS
│   ├── subdomain.ts     # getSubdomain(), SUPABASE_COOKIE_OPTIONS
│   └── twilio.ts        # sendSms() — REST client
├── proxy.ts             # Next.js 16 middleware
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
