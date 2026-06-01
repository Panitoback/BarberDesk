# BarberQueue

Multi-tenant SaaS for independent barbershops. Each shop gets a subdomain, private dashboard, public booking page, and SMS automations powered by Twilio + n8n.

**Live:** [barberqueue.pro](https://barberqueue.pro)
**Pricing:** $19.99 USD/month (solo barber) · $29.99 USD/month (multi-barber) · 7-day free trial · no credit card required

---

## Docs

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Architecture, DB schema, API routes, technical decisions |
| `LAUNCH.md` | In-person sales guide, pitch scripts, FAQs, objection handling |
| `COMPETITORS.md` | Square and SQUIRE feature/pricing breakdown |
| `AUDIT.md` | Bug audit log and intentional design decisions |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui |
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
barberqueue.pro                              → landing + registration
barberqueue.pro/admin                        → platform admin (allowlisted via ADMIN_USER_IDS)
[slug].barberqueue.pro                       → owner's private dashboard
[slug].barberqueue.pro/book                  → public client booking page
[slug].barberqueue.pro/book/confirmed        → booking confirmation
[slug].barberqueue.pro/book/deposit-success  → Stripe deposit paid
[slug].barberqueue.pro/book/deposit-cancel   → Stripe deposit cancelled
[slug].barberqueue.pro/my-appointments       → client portal — view/cancel by phone
[slug].barberqueue.pro/staff/[token]         → read-only staff schedule (no login)
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

### Core
- **Multi-tenant** — each shop gets its own subdomain, RLS-isolated data, and independent config.
- **Public booking** — client-facing page with barber picker, preferred-barber pre-selection by phone, slot availability, and SMS + email confirmation.
- **Stripe deposits** — opt-in per tenant. Client pays a deposit via Stripe Checkout before the booking is confirmed. Deposit applied to service total at checkout. Per-tenant keys stored in `tenants.config`.
- **Full payment upfront** — alternative to deposit; charges the full service price + 13% Ontario HST at booking time. Settings UI lets the owner choose between None / Deposit / Full payment. Dashboard shows "Paid in full" badge; CompleteModal shows $0 due.
- **Waitlist** — clients can join a waitlist for any service+date via a persistent section below the booking form. When an appointment is cancelled, the first unnotified waitlist entry for that date+service is notified via SMS (FIFO).
- **Walk-ins** — instant walk-in entry with anonymous client bucket per shop.
- **Client portal** — clients view and cancel upcoming appointments by phone number at `/my-appointments`.

### Multi-barber (gated by `tenants.multi_barber`)
- Manage 2–4 barbers per shop. Includes per-barber booking picker, least-loaded auto-assign, price modifiers, custom schedules, photo uploads, barber notification emails, and revenue-by-barber dashboard card.

### Branding (per tenant)
- **6 color palettes** — Midnight, Obsidian Gold, Forest, Ocean, Crimson, Mocha. Applied via CSS vars (`--theme-accent`, `--theme-bg`) to the dashboard sidebar and booking page. Tailwind v4 `@theme inline` inlines the vars into all indigo utilities automatically.
- **Shop logo** — upload JPEG/PNG/WebP (max 2 MB). Shown in the dashboard sidebar and booking page header. Stored in Supabase Storage bucket `tenant-logos`.

### Shop gallery
- Up to 10 photos per tenant (min 2 to activate). Shown as a polaroid collage on the booking page (desktop) or a 2-column grid (mobile). Collage shows max 4 photos; if more exist, a "See all" link opens a full carousel modal with keyboard navigation. Stored in Storage bucket `shop-gallery`.

### Per-barber custom schedule
- Each barber can have a custom weekly schedule overriding shop hours. UI in Settings → Barbers: per-day select (Same as shop / Open / Closed) with time inputs. Backend and slot engine already respected `barbers.hours` — this completes the UI layer.

### Automations
- No-show recovery SMS, loyalty points, reactivation SMS + email, Google review requests, appointment reminders, AI auto-reply via n8n + OpenRouter.

### Staff view
- Token-gated read-only schedule page (`/staff/[token]`) for staff. No login required. Owner regenerates token from Settings to revoke access immediately.

### Messaging
- Inbound/outbound SMS via Twilio with Realtime notification bell in dashboard.
- **SMS reply from client detail** — owners can reply directly from the client profile page. Chat-bubble thread with optimistic UI and Ctrl+Enter shortcut.

### Planned (not yet built)
- **Analytics dashboard** — revenue trends, top services, busiest hours, client retention.
- **Automated tenant billing** — Stripe Subscriptions for $19.99/$29.99 plans with trial enforcement.
- **PWA** — installable dashboard and booking page via `next-pwa` (no App Store required).
- **Google Calendar sync** — OAuth2 per barber, auto-sync appointments.
- **Commission tracking** — per-barber revenue breakdown for staff payroll.
- **Barber portfolio** — before/after photo gallery per barber on the booking page.

### Email notifications
- Branded HTML emails for appointment reminders (appointment details card) and reactivation campaigns (10% off highlight box). Sent via Resend from `noreply@barberqueue.pro`.
- Supabase auth emails (password reset, email confirmation) also route through Resend using the custom domain.

---

## Database

**Supabase project:** `gjefeiwsvcjroklvkbuk`

```bash
npx supabase db push
npx supabase gen types typescript --project-id gjefeiwsvcjroklvkbuk > lib/supabase/types.ts
```

> After regenerating types, manually re-add `complete_appointment` and `user_owns_tenant` to the `Functions` block if they are missing.

---

## Storage buckets

| Bucket | Public | Max size | Use |
|--------|--------|----------|-----|
| `barber-photos` | ✅ | 2 MB | Per-barber profile photos |
| `shop-gallery` | ✅ | 3 MB | Shop gallery photos (booking page collage) |
| `tenant-logos` | ✅ | 2 MB | Shop logo (sidebar + booking header) |
