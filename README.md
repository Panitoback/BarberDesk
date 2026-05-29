# BarberQueue

Multi-tenant SaaS for independent barbershops. Each shop gets a subdomain, private dashboard, public booking page, and SMS automations powered by Twilio + n8n.

**Live:** [barberqueue.pro](https://barberqueue.pro) · $19.99 USD/month · 7-day free trial

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind + shadcn/ui |
| Database | Supabase (PostgreSQL + RLS + Realtime) |
| Auth | Supabase Auth — password login + password reset |
| SMS | Twilio |
| Email | Resend |
| Automations | n8n (self-hosted on Railway) |
| AI | OpenRouter via n8n native AI Agent node |
| Deploy | Vercel (app) + Railway (n8n) + Supabase (DB) |

---

## Subdomain routing

```
barberqueue.pro                            → landing + registration
barberqueue.pro/admin                      → platform admin (allowlisted via ADMIN_USER_IDS)
[slug].barberqueue.pro                     → owner's private dashboard
[slug].barberqueue.pro/book                → public client booking
[slug].barberqueue.pro/staff/[token]       → read-only staff schedule view (no login required)
```

`proxy.ts` detects subdomain, guards auth, injects `x-subdomain` header into all requests.

---

## Local dev

```bash
npm install
npm run dev
```

Open the dashboard at `http://test.localhost:3000` (Chrome/Edge resolve `*.localhost` automatically).

All env vars are in `.env` — Supabase, Twilio, Resend, n8n, OpenRouter, WEBHOOK_SECRET.

---

## Features

- **Multi-barber support** — manage 2–4 barbers per shop, gated by `tenants.multi_barber` (admin toggle). Includes per-barber booking picker, least-loaded auto-assign, price modifiers, photo uploads, barber notification emails, and revenue-by-barber dashboard card.
- **Public booking** — client-facing booking page with barber picker, preferred-barber pre-selection by phone, slot availability per barber, and SMS + email confirmation.
- **Automations** — no-show recovery SMS, loyalty points, reactivation SMS, Google review requests, appointment reminders, AI auto-reply via n8n + OpenRouter.
- **Staff view** — token-gated read-only schedule page (`/staff/[token]`) shared with staff. No login required. Owner regenerates token from Settings to revoke access.
- **Walk-ins** — instant walk-in entry with anonymous client bucket per shop.
- **Messaging** — inbound/outbound SMS via Twilio with Realtime notification bell in dashboard.

---

## Database

**Supabase project:** `gjefeiwsvcjroklvkbuk`

```bash
npx supabase db push
npx supabase gen types typescript --project-id gjefeiwsvcjroklvkbuk > lib/supabase/types.ts
```

> After regenerating types, manually re-add `complete_appointment` and `user_owns_tenant` in the `Functions` block of `types.ts`.
