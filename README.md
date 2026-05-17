# BarberPro

Micro-SaaS for independent barbershops in Toronto, Canada.
Each barbershop gets its own subdomain, private dashboard, and SMS automations.

**Price:** $10 USD/month · 14-day free trial · No credit card required

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind + shadcn/ui |
| Backend | Next.js API Routes (serverless) |
| Database | PostgreSQL via Supabase (RLS on all tables) |
| Auth | Supabase Auth — magic link (PKCE) |
| SMS | Twilio |
| Automations | n8n self-hosted on Railway |
| AI | Claude API (claude-sonnet-4-6) |
| Deploy | Vercel + Railway + Supabase |

---

## Subdomain routing

```
barberpro.ca              → public landing page + registration
[slug].barberpro.ca       → barber's private dashboard
```

The `proxy.ts` middleware detects the subdomain (excluding IPs and `www`), validates the session, and passes the `x-subdomain` header to all routes. Cookie attributes (`sameSite`, `secure`, `httpOnly`, `domain`) are preserved on rewrites.

Login from the root domain (`barberpro.ca/login`) automatically redirects to the owner's subdomain — `app/auth/callback/route.ts` looks up the user's tenant and redirects to `https://{slug}.barberpro.ca/dashboard`.

---

## Automations

| # | Trigger | Action | Status |
|---|---------|--------|--------|
| 1 | SMS from barber | No-show → recovery SMS to client | API ready, n8n pending |
| 2 | Appointment completed | Add points + notify if level up | API ready, n8n pending |
| 3 | Weekly cron | Detect 30+ day inactive clients → personalized SMS | API ready, n8n pending |
| 4 | Appointment completed | Wait 30 min → Google review request SMS | API ready, n8n pending |
| 5 | Inbound SMS | Claude API responds with barbershop context | Pending |

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

```bash
cp .env .env.local
```

Fill in `.env.local`:

| Variable | When |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Available now |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Available now |
| `SUPABASE_SERVICE_ROLE_KEY` | Available now |
| `TWILIO_ACCOUNT_SID` | When configuring Phase 3.1 |
| `TWILIO_AUTH_TOKEN` | When configuring Phase 3.1 |
| `TWILIO_PHONE_NUMBER` | When configuring Phase 3.1 |
| `WEBHOOK_SECRET` | Generate with `openssl rand -hex 32` when configuring n8n |
| `N8N_BASE_URL` | When deploying n8n on Railway |
| `N8N_API_KEY` | When deploying n8n on Railway |
| `ANTHROPIC_API_KEY` | When configuring Phase 3.4 |

### 3. Run locally

```bash
npm run dev
```

To test the dashboard without a real subdomain, there is a development fallback in `lib/subdomain.ts → getSubdomain()`:
- Accessing `http://localhost:3000/dashboard` works directly
- The loaded tenant is whichever has `subdomain = 'test'` in the DB
- **Before deploy:** remove that branch (see Technical Debt in `CLAUDE.md`)

---

## Database

**Supabase project:** `gjefeiwsvcjroklvkbuk`

### Apply migrations

```bash
npx supabase db push
```

### Regenerate TypeScript types

```bash
npx supabase gen types typescript \
  --project-id gjefeiwsvcjroklvkbuk \
  > lib/supabase/types.ts
```

> **Note:** After regenerating types, manually re-add `complete_appointment` and `user_owns_tenant` in the `Functions` section of `types.ts` (see the file for the exact format).

### Applied migrations

| File | Contents |
|------|----------|
| `20260419044041_initial_schema.sql` | Full schema — tables, RLS, triggers, ENUMs |
| `20260421000000_complete_appointment_fn.sql` | RPC `complete_appointment` — atomic transaction |
| `20260422000000_citas_table.sql` | Original `citas` table + `cita_estado` enum |
| `20260422120000_harden_rls_multi_tenant.sql` | Replaces `get_tenant_id()` with `user_owns_tenant(uuid)` in all policies — supports multiple tenants per owner |
| `20260516000000_english_schema.sql` | Renames all Spanish columns/table/enum to English |

---

## Multi-tenant architecture

- Every table has `tenant_id` — no exceptions
- Every query filters by `tenant_id` — no exceptions
- RLS enabled on all tables — the DB rejects queries without a tenant filter
- `user_owns_tenant(uuid)` — SQL helper function used by all RLS policies. Verifies that the current `auth.uid()` is the owner of the given `tenant_id`. Supports multiple tenants per owner.
- Data between barbershops is **never** mixed
- Supabase cookies scoped to `.barberpro.ca` in production (via `lib/subdomain.ts → SUPABASE_COOKIE_OPTIONS`) so the session works across subdomains

### Auth patterns in API routes

| Caller | Auth | Supabase client |
|--------|------|-----------------|
| Authenticated browser | Session cookie | `createClient()` (server, RLS active) |
| n8n webhook | `Authorization: Bearer ${WEBHOOK_SECRET}` | `createAdminClient()` (service-role, bypasses RLS) |
| Anonymous visitor in registration flow | — | `createAdminClient()` only in `check-slug` (needs to see other tenants) |

---

## Project status (2026-05-16)

| Module | Status |
|--------|--------|
| Foundation (Next.js, Supabase, Auth, middleware) | ✅ Complete |
| Dashboard (stats, appointments, clients, loyalty) | ✅ Complete |
| SMS API routes (noshow, reactivate, reviews) | ✅ Complete (cookie + webhook bearer) |
| Public landing + barbershop registration | ✅ Complete (slug re-validation, wildcard cookie, post-login redirect) |
| Multi-tenant RLS hardening | ✅ Applied to remote |
| English schema migration | ✅ Applied to remote (2026-05-16) |
| SMS infrastructure (Twilio + n8n on Railway) | ⏳ Pending credentials |
| n8n workflows (5 automations) | ⏳ Blocked by infra |
| AI auto-reply (Claude API) | ⏳ Blocked by infra |
| Deploy to Vercel + barberpro.ca domain | 🔲 Next step |

---

## Useful commands

```bash
npm run dev                  # local development
npm run build                # production build (verifies TypeScript)
npx supabase db push         # apply migrations
openssl rand -hex 32         # generate WEBHOOK_SECRET for n8n
```

---

## Full roadmap

See [ROADMAP.md](ROADMAP.md)
