# BarberQueue / SalonQueue

Multi-tenant SaaS for independent barbershops and beauty salons. Each shop gets a subdomain, private dashboard, public booking page, and SMS automations powered by Twilio + n8n. Same codebase, same Supabase project — two markets.

**Live (barbershops):** [barberqueue.pro](https://barberqueue.pro)
**Live (salons):** [salonqueue.pro](https://salonqueue.pro)
**Pricing:** $19.99 CAD/month (solo) · $29.99 CAD/month (multi-barber) · + applicable taxes · 14-day free trial · no credit card required

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
| Email | Resend (`noreply@barberqueue.pro`) |
| Automations | n8n (self-hosted on Railway) |
| AI | OpenRouter via n8n native AI Agent node |
| Deploy | Vercel (app) + Railway (n8n) + Supabase (DB) |

---

## Subdomain routing

```
barberqueue.pro                              → landing + registration (barbershops)
salonqueue.pro                               → landing (salons) — rewrite to app/salon/page.tsx
barberqueue.pro/admin                        → platform admin (allowlisted via ADMIN_USER_IDS)
[slug].barberqueue.pro                       → owner's private dashboard (barber tenant)
[slug].salonqueue.pro                        → owner's private dashboard (salon tenant)
[slug].barberqueue.pro/setup                 → first-login onboarding wizard
[slug].barberqueue.pro/book                  → public client booking page
[slug].barberqueue.pro/book/confirmed        → booking confirmation
[slug].barberqueue.pro/book/deposit-success  → Stripe deposit/full payment confirmed
[slug].barberqueue.pro/book/deposit-cancel   → Stripe checkout cancelled (slot freed)
[slug].barberqueue.pro/my-appointments       → client portal — view/cancel by phone
[slug].barberqueue.pro/staff/[token]         → read-only staff schedule (no login)
```

Same routes apply under `*.salonqueue.pro`. `proxy.ts` detects subdomain + domain, guards auth, and injects `x-subdomain` header. `tenants.market` (`'barber'` | `'salon'`) controls which domain to use for booking URLs and SMS links.

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
- **Onboarding wizard** — 5-step setup on first login (Hours → Services → Logo → Reminders → Done). Skippable. `onboarding_done` stored in `tenants.config`.
- **Public booking** — client-facing page with barber picker, preferred-barber pre-selection by phone, slot availability, and SMS + email confirmation.
- **Stripe deposits** — opt-in per tenant. Client pays a deposit via Stripe Checkout before the booking is confirmed. Deposit deducted from service total at checkout. Per-tenant keys stored in `tenants.config`.
- **Full payment upfront** — alternative to deposit; charges full service price + 13% Ontario HST at booking time. Mutually exclusive with deposit. Dashboard shows "Paid in full" badge; CompleteModal shows $0 due.
- **Waitlist** — clients join a waitlist for any service+date. When an appointment is cancelled, the first unnotified entry is texted automatically (FIFO).
- **Walk-ins** — instant walk-in entry with anonymous client bucket per shop.
- **Client portal** — clients view and cancel upcoming appointments by phone number at `/my-appointments`.

### Multi-barber (gated by `tenants.multi_barber`)
- Manage multiple barbers per shop. Includes per-barber booking picker, least-loaded auto-assign, price modifiers, custom schedules, photo uploads, Instagram handle link on booking page, barber notification emails, and revenue-by-barber dashboard card.
- **Payroll tab** — per-barber commission breakdown with period picker (this week / last week / this month / last month). Shows revenue and commission earned per barber based on `barbers.commission_pct`. Gated at nav + page + API level.

### Branding (per tenant)
- **6 color palettes** — Midnight, Obsidian Gold, Forest, Ocean, Crimson, Mocha. Applied via CSS vars to the dashboard sidebar and booking page.
- **Shop logo** — upload JPEG/PNG/WebP (max 2 MB). Shown in the dashboard sidebar and booking page header.

### Shop gallery
- Up to 10 photos per tenant (min 2 to activate). Shown as a collage on the booking page (desktop) or 2-column grid (mobile). "See all" opens a carousel modal with keyboard navigation.

### Automations
- No-show recovery SMS, loyalty points (Bronze → Platinum), reactivation SMS + email, Google review requests, appointment reminders, AI auto-reply via n8n + OpenRouter.

### Staff view
- Token-gated read-only schedule page (`/staff/[token]`). No login required. Owner regenerates token from Settings to revoke access immediately.

### Messaging
- Inbound/outbound SMS via Twilio with Realtime notification bell in dashboard.
- Direct SMS reply from the client profile page — chat-bubble thread with optimistic UI and Ctrl+Enter shortcut.

### Email notifications
- Branded HTML emails for appointment reminders and reactivation campaigns. Sent via Resend from `noreply@barberqueue.pro`.
- Supabase auth emails (password reset) also route through Resend.

### Analytics
- **`/analytics` page** — client-side with period picker (this week / last week / this month / last month / last 3 months). 4 stat cards (revenue, avg per visit, no-show rate, registered clients) + 4 charts: Revenue trend (weekly bars), Top services (horizontal bars by revenue), Busiest times (hour heatmap 8am–9pm), Appointment status breakdown (stacked bar + legend). No external chart library — pure CSS. All chart colors use `var(--theme-accent)` for dynamic theme support. Revenue by barber chart shown only when `multi_barber=true`.

### PWA
- Installable from browser on both dashboard and booking page (no App Store required). `public/sw.js` (cache-first for static assets, network-only for pages/API) + dynamic `app/manifest.ts` per tenant (name + theme colors) + barber-pole icons (192, 512, apple-touch-icon).

### Multi-market (barber / salon)
- Same app deployed on two domains. `tenants.market` (`'barber'` | `'salon'`) set at registration from the Host header.
- `salonqueue.pro` has its own landing page (`app/salon/page.tsx`), separate copy and branding.
- All booking URLs, waitlist SMS links, onboarding wizard, client portal branding, and cookie domains are market-aware.
- **⚠️ Pending production verification** — deployed 2026-06-30. Full e2e test (register from salonqueue.pro → dashboard → booking URL → waitlist SMS) not yet confirmed in production.

### Planned (not yet built)
- **Automated tenant billing** — Stripe Subscriptions for $19.99/$29.99 CAD plans with trial enforcement. Currently billed manually.
- **Google Calendar write sync** — auto-sync create/cancel/complete TO Google Calendar (read-only integration already live).
- **Barber portfolio** — before/after photo gallery per barber on booking page. Deferred in favour of Instagram handle link.

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
