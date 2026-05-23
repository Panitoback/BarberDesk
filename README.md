# BarberQueue

Multi-tenant SaaS for independent barbershops in Toronto, Canada.
Each shop gets its own subdomain, private dashboard, and SMS automations.

**Price:** $10 USD/month · 14-day free trial

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind + shadcn/ui |
| Database | PostgreSQL via Supabase (RLS on all tables) |
| Auth | Supabase Auth — magic link (PKCE) + email/password + password reset |
| SMS | Twilio |
| Email | Resend |
| Automations | n8n self-hosted on Railway |
| AI | OpenRouter (model-agnostic — n8n native integration) |
| Deploy | Vercel + Railway + Supabase |

---

## Subdomain routing

```
barberqueue.pro            → landing page + registration
[slug].barberqueue.pro     → barber's private dashboard
```

`proxy.ts` middleware detects the subdomain, guards auth, and injects `x-subdomain` into all requests.

---

## Local setup

```bash
npm install
npm run dev
```

Variables are in `.env` — all keys (Supabase, Twilio, Resend, n8n, OpenRouter) are filled in.

For local dashboard testing, open `http://test.localhost:3000` — the proxy resolves the `test` tenant from the real subdomain (Chrome/Edge resolve `*.localhost` automatically). Sign in at `http://test.localhost:3000/login`.

---

## Automations

| # | Trigger | Action | Status |
|---|---------|--------|--------|
| 1 | SMS from barber | No-show → recovery SMS | API ready, n8n built — pending verify |
| 2 | Appointment completed | Add points + notify level up | API ready, n8n built — pending verify |
| 3 | Weekly cron | 30+ day inactive clients → SMS | API ready, n8n built — pending verify |
| 4 | Appointment completed | Wait 30 min → review request SMS | API ready, n8n built — pending verify |
| 5 | Inbound SMS | OpenRouter auto-reply (model selectable in n8n) | Built — pending verify |
| 6 | Weekly cron | 30+ day inactive clients → reactivation SMS (always) + email if client has one (Resend) | Built — pending verify |

---

## Public booking

Every shop gets a public booking page at `[slug].barberqueue.pro/book` (linked from the dashboard with a copy-to-clipboard card).

- Visitors don't sign in — they pick a service, date, and 30-min slot, and enter name + phone
- `app/api/book/slots` exposes taken times so the form hides occupied slots in real time
- A partial unique index on `appointments (tenant_id, date, time) WHERE status IN ('pending','completed')` prevents double-booking even under concurrent submits
- Rate limits: **10 bookings/min per shop**, **3 bookings/day per phone** (caps SMS-spend damage from abuse)
- Suspended shops (`plan = 'suspended'`) automatically reject new bookings — both the form and the API
- Confirmation SMS is best-effort: Twilio failures never block the booking; the outcome is persisted to `messages`
- Dashboard `Upcoming bookings` card lets the owner cancel — cancel sends a courtesy SMS and frees the slot back up

---

## Project status (2026-05-23)

| Module | Status |
|--------|--------|
| Foundation (Next.js, Supabase, Auth, middleware) | ✅ Complete |
| Dashboard (stats, appointments, clients, loyalty) | ✅ Complete — mobile-responsive |
| Auth (magic link, password login, password recovery) | ✅ Complete |
| SMS API routes (noshow, reactivate, reviews) | ✅ Complete |
| Public landing + registration flow | ✅ Complete |
| Public booking flow (`/book` + slot picker + cancel) | ✅ Complete |
| Legal pages (privacy, terms, refund) | ✅ Complete |
| Local dev working | ✅ Verified |
| SMS infrastructure (Twilio + n8n on Railway) | ✅ Credentials set |
| n8n workflows | 🔄 Built, pending verification |
| AI auto-reply (OpenRouter vía n8n) | 🔄 Built, pending verification |
| Domain (`barberqueue.pro`) | ✅ Registered |
| Deploy to Vercel | 🔲 Pending — domain DNS + env vars |

---

## Database

**Supabase project:** `gjefeiwsvcjroklvkbuk`

```bash
npx supabase db push           # apply migrations
npx supabase gen types typescript --project-id gjefeiwsvcjroklvkbuk > lib/supabase/types.ts
```

> After regenerating types, manually re-add `complete_appointment` and `user_owns_tenant` in the `Functions` section of `types.ts`.

See [ROADMAP.md](ROADMAP.md) for full details.
