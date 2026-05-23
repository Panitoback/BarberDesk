# Competitor Analysis — barberpro.ca

> Captured 2026-05-22. Working notes — to be acted on later.
> Source: deep scrape of https://barberpro.ca/ (JS-rendered single-page site).

## What barberpro.ca is

A polished **booking + payments SaaS** for barbershops in Canada. It is an active
competitor — same niche, same country, and (problematically) the same name as our
project. Landing page structure:

- Hero with a product dashboard mockup (revenue, appointments, upcoming clients)
- "Why BarberPro" — problem → solution pairs
- Features with audience tabs (For Barbers / For Business / For Clients)
- How it works (4 steps)
- Testimonials ("Shop stories") with hard metrics — Moncton, Halifax, Ottawa
- Comparison table (BarberPro vs Alternatives)
- Pricing: 3 tiers — Shop $29 / Pro $79 / Enterprise $199 CAD, monthly/annual toggle
- FAQ (8 questions, accordion)
- Footer with legal pages + "Service status: operational"

## Similarities

Visually almost identical: dark background (near-black) + amber accent, "14-day free
trial" badge, "Set up in under 10 minutes", "no credit card required", barbershop
niche, Canada focus.

## Key difference — different products

| | barberpro.ca | Us (BarberDesk) |
|---|---|---|
| Core | Online booking + payments + deposits | SMS automation + loyalty |
| Client self-booking | Yes — branded booking link | No — not built |
| SMS | "Coming soon" (Pro plan) | Core of the product |
| Loyalty / points | No | Yes (Bronze → Platinum) |
| Inactive-client reactivation | No | Yes |
| AI auto-reply | No | Yes |
| Google review requests | No | Yes |
| Price | $29–199 CAD | $10 USD |

They are an **acquisition** tool (get clients to book and pay). We are a
**retention** tool (get clients to come back).

## What we can do better

1. **SMS already works — theirs is "coming soon."** Their $79 Pro plan lists
   "SMS reminders (coming soon)". We already do no-show recovery, reactivation,
   review requests, and AI auto-reply over SMS. Biggest advantage — lead with it.
2. **Price** — $10 vs $29–199. One simple plan.
3. **Loyalty, reactivation, AI auto-reply, Google reviews** — features they lack.
4. **AI** — no one in this niche uses it. Strong modern differentiator.

## Design ideas worth borrowing

1. **Testimonials with hard metrics** ("No-shows down 60%", "+30% bookings") —
   their most persuasive section. We have none. Biggest gap.
2. **FAQ accordion** — handles objections before they are raised.
3. **Comparison table** — "us vs alternatives".
4. **Problem → solution layout** — name the pain first, then the fix.
5. **Product mockup in the hero** — theirs shows a real dashboard. We could show
   both the SMS bubbles and a mini-dashboard.
6. **Audience-tabbed features** (For Barbers / Business / Clients).
7. **"Book a demo"** as a secondary CTA.
8. **Footer with legal pages** (Privacy, Terms, Refund) — also required for a real SaaS.

## ⚠️ The naming problem

This is no longer just "the domain is taken". There is an **active company, in the
same country, in the exact same niche, with the exact same name** — "BarberPro".
Launching as "BarberPro" would be unworkable (SEO, brand confusion) and a possible
trademark risk.

**Action: rename the product, not just the domain.** `BarberDesk` (the repo name)
is a natural, already-differentiated candidate.

## Strategic question to resolve later

Their must-have feature is online booking; ours is automation/retention. Decide
positioning: stay a complementary retention layer, or add online booking to compete
head-on.

## Next steps (later)

- [ ] Decide the final product name (rename from "BarberPro")
- [ ] Register a domain under the new name
- [ ] Add testimonials, FAQ, and a comparison table to the landing page
- [ ] Consider the problem → solution layout and a hero product mockup
- [ ] Decide on the booking question above
