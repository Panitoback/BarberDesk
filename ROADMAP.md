# Roadmap — BarberPro

## Status (2026-05-20)

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

### 3.1 — Infrastructure ✅ Complete
- [x] Twilio number (`+1 249 421 1641`) + Account SID + Auth Token → `.env`
- [x] Twilio Console messaging webhook → `https://barberpro.ca/api/webhooks/twilio`
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
- [x] n8n on Railway (done in Phase 3.1)

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
