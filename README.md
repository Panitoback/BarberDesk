# BarberPro

Multi-tenant SaaS for independent barbershops in Toronto, Canada.
Each shop gets its own subdomain, private dashboard, and SMS automations.

**Price:** $10 USD/month · 14-day free trial

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind + shadcn/ui |
| Database | PostgreSQL via Supabase (RLS on all tables) |
| Auth | Supabase Auth — magic link (PKCE) + email/password |
| SMS | Twilio |
| Email | Resend |
| Automations | n8n self-hosted on Railway |
| AI | OpenRouter (model-agnostic — n8n native integration) |
| Deploy | Vercel + Railway + Supabase |

---

## Subdomain routing

```
barberpro.ca            → landing page + registration
[slug].barberpro.ca     → barber's private dashboard
```

`proxy.ts` middleware detects the subdomain, guards auth, and injects `x-subdomain` into all requests.

---

## Local setup

```bash
npm install
npm run dev
```

Variables are in `.env` — Supabase keys are already filled in. Twilio, Resend, n8n, and OpenRouter keys are set when their phases are configured.

For local dashboard testing, access `http://localhost:3000/dashboard` — the app loads the tenant with `subdomain = 'test'` automatically.

---

## Automations

| # | Trigger | Action | Status |
|---|---------|--------|--------|
| 1 | SMS from barber | No-show → recovery SMS | API ready, n8n pending |
| 2 | Appointment completed | Add points + notify level up | API ready, n8n pending |
| 3 | Weekly cron | 30+ day inactive clients → SMS | API ready, n8n pending |
| 4 | Appointment completed | Wait 30 min → review request SMS | API ready, n8n pending |
| 5 | Inbound SMS | OpenRouter auto-reply (model selectable in n8n) | Pending |
| 6 | Weekly cron | 30+ day inactive clients → reactivation SMS (always) + email if client has one (Resend) | Pending |

---

## Project status (2026-05-17)

| Module | Status |
|--------|--------|
| Foundation (Next.js, Supabase, Auth, middleware) | ✅ Complete |
| Dashboard (stats, appointments, clients, loyalty) | ✅ Complete |
| SMS API routes (noshow, reactivate, reviews) | ✅ Complete |
| Public landing + registration flow | ✅ Complete |
| Local dev working | ✅ Verified |
| SMS infrastructure (Twilio + n8n on Railway) | ⏳ Pending credentials |
| n8n workflows | ⏳ Blocked by infra |
| AI auto-reply (OpenRouter vía n8n) | ⏳ Blocked by infra |
| Deploy to Vercel + barberpro.ca | 🔲 Next step |

---

## Database

**Supabase project:** `gjefeiwsvcjroklvkbuk`

```bash
npx supabase db push           # apply migrations
npx supabase gen types typescript --project-id gjefeiwsvcjroklvkbuk > lib/supabase/types.ts
```

> After regenerating types, manually re-add `complete_appointment` and `user_owns_tenant` in the `Functions` section of `types.ts`.

See [ROADMAP.md](ROADMAP.md) for full details.
