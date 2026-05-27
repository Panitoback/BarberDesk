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
barberqueue.pro           → landing + registration
barberqueue.pro/admin     → platform admin (allowlisted via ADMIN_USER_IDS)
[slug].barberqueue.pro    → barber's private dashboard
[slug].barberqueue.pro/book → public client booking
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

## Database

**Supabase project:** `gjefeiwsvcjroklvkbuk`

```bash
npx supabase db push
npx supabase gen types typescript --project-id gjefeiwsvcjroklvkbuk > lib/supabase/types.ts
```

> After regenerating types, manually re-add `complete_appointment` and `user_owns_tenant` in the `Functions` block of `types.ts`.
