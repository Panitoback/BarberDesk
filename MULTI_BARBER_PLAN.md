# Multi-Barber Support — Implementation Plan

> Status: planning · updated 2026-05-28
> Execution split: **Phase 1+2 in one session**, then **Phase 3+4 in a second session**.

## Goal

Enable a single tenant (shop) to manage multiple barbers under one owner login.
Customers can pick a specific barber when booking or let the system auto-assign.

---

## Product decisions (locked)

| Decision | Value | Why |
|---|---|---|
| Login | Owner only. No per-barber accounts | Simpler — no auth refactor, no RLS rewrite |
| Twilio number | One per shop (current model) | Customers already SMS the shop, not the barber |
| Barber notification | Email via Resend (not SMS) | Twilio per-message cost too high for internal notifications |
| Loyalty points | Per shop (current model) | Client is loyal to the shop, not a barber |
| No-show count | Per client per shop (current model) | Same reasoning |
| Booking "Any barber" | Auto-assign on submit — least-loaded (fewest appts today) | Balances workload; avoids always overloading barber #1 |
| Scale | 2-4 barbers typical | Allows column-based UI in `/agenda` |
| Barber fields | name, active, email, photo, bio, price_modifier, own hours | email for booking notifications; price_modifier for senior/junior pricing |
| /settings UX | Refactor to sub-tabs | "Barbers" is its own section; current single-scroll form too long |

---

## Phase 1 — Schema + Settings UI (~3.5h)

### Migrations

#### `20260529000000_barbers.sql`
```sql
CREATE TABLE barbers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           text NOT NULL,
  active         boolean NOT NULL DEFAULT true,
  email          text,                        -- optional; receives booking notification emails via Resend
  photo_path     text,                        -- Storage path: {tenant_id}/{barber_id}.{ext}
  bio            text,                        -- max 200 chars
  price_modifier numeric NOT NULL DEFAULT 1.0, -- multiplier applied to service price (0.85 = 15% less, 1.2 = 20% more)
  hours          jsonb,                       -- same shape as tenants.config.hours; NULL = inherit shop hours
  display_order  int  NOT NULL DEFAULT 0,     -- order in BookingForm + /agenda columns
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (length(name) BETWEEN 1 AND 80),
  CHECK (length(coalesce(bio,'')) <= 200),
  CHECK (price_modifier > 0 AND price_modifier <= 5),
  CHECK (email IS NULL OR email ~* '^[^@]+@[^@]+\.[^@]+$')
);
CREATE INDEX idx_barbers_tenant_active ON barbers(tenant_id, active);

ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY barbers_owner_select ON barbers FOR SELECT USING (user_owns_tenant(tenant_id));
CREATE POLICY barbers_owner_insert ON barbers FOR INSERT WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY barbers_owner_update ON barbers FOR UPDATE USING (user_owns_tenant(tenant_id)) WITH CHECK (user_owns_tenant(tenant_id));
CREATE POLICY barbers_owner_delete ON barbers FOR DELETE USING (user_owns_tenant(tenant_id));
```

#### `20260529000001_appointments_barber_id.sql`
```sql
ALTER TABLE appointments ADD COLUMN barber_id uuid REFERENCES barbers(id) ON DELETE SET NULL;
CREATE INDEX idx_appts_barber_date ON appointments(barber_id, date) WHERE barber_id IS NOT NULL;
COMMENT ON COLUMN appointments.barber_id IS 'Assigned barber; NULL for legacy appointments before multi-barber';
```
Existing appointments → `barber_id = NULL`. They render in an "Unassigned" column in agenda.

#### `20260529000002_time_blocks_barber_id.sql`
```sql
ALTER TABLE time_blocks ADD COLUMN barber_id uuid REFERENCES barbers(id) ON DELETE CASCADE;
COMMENT ON COLUMN time_blocks.barber_id IS 'NULL = block applies to the entire shop; set = block only this barber';
CREATE INDEX idx_time_blocks_barber ON time_blocks(barber_id) WHERE barber_id IS NOT NULL;
```

#### `20260529000003_clients_preferred_barber.sql`
```sql
ALTER TABLE clients ADD COLUMN preferred_barber_id uuid REFERENCES barbers(id) ON DELETE SET NULL;
COMMENT ON COLUMN clients.preferred_barber_id IS 'Last barber this client booked with; auto-updated on booking; pre-selected in BookingForm';
```
No UI for the owner to set manually — it's inferred from the last booking and used as a hint in BookingForm.

### Supabase Storage

- Bucket: `barber-photos`
- Public read; owner-only write via policy `auth.uid() owns the tenant in path`
- Upload path: `{tenant_id}/{barber_id}.{ext}` — overwrite on re-upload
- Max size: 2MB; allowed types: image/jpeg, image/png, image/webp

Bucket setup commands (run via MCP at Phase 1 start):
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('barber-photos', 'barber-photos', true);
CREATE POLICY barber_photos_public_read ON storage.objects FOR SELECT USING (bucket_id = 'barber-photos');
CREATE POLICY barber_photos_owner_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'barber-photos' AND
  user_owns_tenant((storage.foldername(name))[1]::uuid)
);
CREATE POLICY barber_photos_owner_update ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'barber-photos' AND
  user_owns_tenant((storage.foldername(name))[1]::uuid)
);
CREATE POLICY barber_photos_owner_delete ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'barber-photos' AND
  user_owns_tenant((storage.foldername(name))[1]::uuid)
);
```

### Settings tabs refactor

Convert `app/dashboard/settings/page.tsx` + `components/dashboard/SettingsForm.tsx` to tabbed layout.

New tabs (URL-driven via `?tab=`):
1. **General** — opening hours, address, notification email, Google review link
2. **Services** — services + prices + duration (existing)
3. **Barbers** *(new)* — CRUD list
4. **Reminders** — reminder + flash discount toggle

Implementation choice: keep `SettingsForm.tsx` as a parent, split sections into `<GeneralTab/>`, `<ServicesTab/>`, `<BarbersTab/>`, `<RemindersTab/>`. Each tab saves independently (separate POST per tab keeps changes scoped).

New API routes:
- `GET  /api/barbers`              — list (owner-scoped)
- `POST /api/barbers`              — create
- `PATCH /api/barbers/[id]`        — update name/active/email/bio/price_modifier/hours/display_order
- `DELETE /api/barbers/[id]`       — soft constraint: refuse if barber has future appointments; suggest deactivating instead
- `POST /api/barbers/[id]/photo`   — multipart upload, writes to Storage, updates `photo_path`

### BarbersTab UI
- Table of barbers with: avatar (40px), name (editable inline), email field, price modifier (shown as e.g. "+20%" or "-15%"), bio (collapsed), active toggle, "Custom hours" collapsible
- "Add barber" button → row with empty fields
- Photo upload: click avatar → file picker → upload → preview
- Order: ↑↓ buttons on each row (update `display_order`)
- "Custom hours" inside each barber row: same UI as shop's Opening hours but optional (toggle "Use shop hours" / "Custom")
- Price modifier: small input with helper "1.0 = same as service price · 0.85 = 15% less · 1.2 = 20% more"

### TS types

Regenerate via MCP or manually add to `lib/supabase/types.ts`:
- `barbers` table (Row/Insert/Update) — includes `email`, `price_modifier`, `preferred_barber_id`
- `appointments.barber_id`
- `time_blocks.barber_id`
- `clients.preferred_barber_id`

### Helper: `lib/barbers.ts` (new)

```ts
export type Barber = {
  id: string; name: string; active: boolean; email: string | null;
  photo_path: string | null; bio: string | null; price_modifier: number; hours: Hours | null;
}
export function barberPhotoUrl(path: string | null): string | null
export function effectiveHoursForBarber(barber: Barber, shopConfig: TenantConfig): Hours
export function applyPriceModifier(basePrice: number, modifier: number): number
```

### `lib/slots.ts` changes
- New signature: `getStartableSlotsForBarber(barberHours, dateISO, takenSlotsForBarber, blockedSlotsForBarber, durationMin)`
- `expandTakenSlots` and `expandBlockedSlots` stay as-is (per-barber filtering happens at the API query level)

---

## Phase 2 — Booking flow (~3h)

### New public API: `GET /api/book/barbers`
- Query: `?subdomain=` (auto from header)
- Returns: `{ barbers: Array<{ id, name, photo_url, bio, price_modifier }> }` — only active barbers, ordered by `display_order`
- Uses `createAdminClient()` (anon can't query directly)

### `GET /api/book/slots` extended
- New param: `barber_id=any|<uuid>`
- For `<uuid>`: query appointments WHERE `barber_id = X`, blocks WHERE `barber_id IN (NULL, X)`, hours from that barber (or shop fallback), compute startable slots
- For `any`:
  - Query all active barbers + their hours
  - Query all appointments for date (with barber_id), all blocks (barber_id NULL or any active barber)
  - A slot is "any-available" if AT LEAST ONE barber has it free and within hours
  - Return slots only (server picks barber at submit time)
- Response unchanged: `{ taken, slots }`

### `POST /api/book` extended
- New field: `barber_id?: 'any' | uuid`
- If `'any'` (or missing): server queries active barbers, selects **least-loaded** (fewest appointments today) whose:
  1. hours include this slot,
  2. has no overlapping appointment,
  3. has no shop-wide block AND no own block.
  Assigns that `barber_id`. If none available → 409 "No barber available at that time"
- If specific uuid: validate availability for that barber only; assigns it
- After INSERT: if assigned barber has `email`, send booking notification email via Resend (fire-and-forget with `after()`)
- `appointments.price` snapshot = `service.price * barber.price_modifier` (rounded to 2 decimals)
- Update `clients.preferred_barber_id = barber_id` on successful booking

- SMS confirmation includes barber name: `"Hi Jordan, your Classic Haircut with Marco at Miffy Barbershop is confirmed for ..."`

### Barber booking notification email (Resend)
- **To:** `barber.email`
- **From:** same `from` address as owner notifications (`notifications@barberqueue.pro`)
- **Subject:** `New booking — {clientName} at {time} ({service})`
- **Body (text):** simple — client name, service, date, time, duration, client note if any
- Sent via `after()` inside `/api/book` — non-blocking, failure is silent (no retry needed)
- Also sent from `/api/appointments/create` when owner books manually

### `POST /api/appointments/create` and `POST /api/walkin`
- New field: `barber_id?: 'any' | uuid` (owner-side)
- Same least-loaded auto-assign logic
- Walk-in: barber typically selected (owner knows who's free); default first active barber
- `appointments.price` snapshot applies `price_modifier`
- Update `clients.preferred_barber_id` after successful insert
- Send barber notification email if barber has email

### `BookingForm.tsx`
- New step (before service): "Pick a barber" card grid (avatars + names + bios + price hint if modifier ≠ 1.0). Includes "Any available barber" card at top
- **Pre-selection:** if returning client (identified by phone/email), BookingForm pre-selects their `preferred_barber_id` via a `GET /api/book/client-preference?phone=` endpoint (returns `{ preferred_barber_id }` or null); client can override
- Selection drives `barber_id` query param on subsequent `/api/book/slots` fetches
- Visual: 2-col grid on mobile, 3-col on desktop; "Any" card has scissors icon
- Price hint: if `price_modifier !== 1.0`, show small badge on barber card (e.g. "Prices +20%")

### New public API: `GET /api/book/client-preference`
- Query: `?phone=<e164>&subdomain=`
- Returns: `{ preferred_barber_id: uuid | null }`
- Uses `createAdminClient()` — looks up `clients` by `tenant_id + phone`, returns `preferred_barber_id`
- Rate-limited same as `/api/book` (same IP limiter)

### SMS strings
Add `barberName` to confirmation/reminder/cancel SMS where relevant. Where barber name unknown (legacy unassigned), omit gracefully.

---

## Phase 3 — Owner UI + tip modal (~2.5h)

### `AppointmentsTodayTable`
- New column "Barber" (mobile: shown under client name as small badge with color)
- Click barber badge → dropdown to reassign (POST `/api/appointments/[id]/reassign`)
- Color palette: indigo / emerald / amber / rose (cycle by `display_order` mod 4)

### New API: `POST /api/appointments/[id]/reassign`
- Body: `{ barber_id: uuid | null }`
- Validates availability for the new barber (no double-book)
- Updates row; does NOT re-send notification email (owner action, barber is notified verbally)

### `WeeklyAgenda` (`/agenda`)
- New filter UI above the grid: pill-style buttons `[ All | Marco | Luis | Unassigned ]`
- Each appointment card gets a 2px left border in barber color + small initials badge
- Time blocks: shop-wide (current style: hatch over all) vs barber-specific (hatch only when filter matches)

### `NewAppointmentButton` + `WalkInButton`
- New dropdown "Assign to..." with options: "Any available" + each active barber
- For walk-in: server-side auto-assign uses `nowTimeInToronto()` and least-loaded barber currently free

### Dashboard
- New card "Revenue by barber" (current month) — table: barber name + revenue + visit count
- Lives next to "Revenue this month"

---

## Phase 4 — Edge cases + polish + docs (~1h)

### Per-barber hours override
- `effectiveHoursForBarber(barber, shopConfig)` — barber.hours wins if set, else shopConfig.hours
- Used in slot helper and `/api/book/slots`
- BarbersTab UI: collapsible "Custom hours" per barber

### Backfill behaviour
- Existing appointments (`barber_id IS NULL`) appear in `/agenda` under "Unassigned" filter
- Dashboard "Appointments today" still shows them (no filter applied by default)
- Owner can assign individually via reassign dropdown
- Document in CLAUDE.md as expected behaviour, not a bug

### Time blocks UI update
- `BlockTimeButton` modal: new dropdown "Applies to: Entire shop / [specific barber]"
- API `/api/time-blocks` accepts `barber_id?: uuid | null`
- Conflict check runs against:
  - All appointments if `barber_id IS NULL`
  - Only that barber's appointments if `barber_id` set

### CLAUDE.md updates
- Migrations section: 5 new entries (barbers, appts barber_id, time_blocks barber_id, clients preferred_barber_id, visits tip)
- Tables section: add `barbers`, update `appointments`, `time_blocks`, `clients`, `visits`
- API routes: 7+ new entries
- Key architectural decisions: auto-assign (least-loaded), price_modifier, preferred_barber pre-selection, barber email notification via Resend
- Technical debt: any deferred decisions

---

## Open questions to resolve at session start

1. **Photo upload limit**: 2MB strict or allow up to 5MB? (affects mobile UX) — *default: 2MB*
2. **"Unassigned" column in /agenda**: always shown, or only when ≥1 unassigned appointment exists? — *default: conditional*
3. **Bulk reassign**: out of scope or include? — *default: out of scope*
4. **Price modifier UI**: raw multiplier input (1.0 / 0.85) or percentage offset (+20% / -15%)? — *default: percentage offset (more intuitive for owners)*

---

## Risks + mitigations

| Risk | Mitigation |
|---|---|
| SettingsForm refactor breaks existing save flow | Manual test of all current sections (hours/services/address/email/review/reminder/flash) before merging Phase 1 |
| "Any available" picks "wrong" barber when client had a preference | BookingForm pre-selects preferred_barber_id; "Any" is a deliberate opt-in above the barber list |
| price_modifier applied inconsistently between /api/book and /api/appointments/create | Centralize in `applyPriceModifier()` in lib/barbers.ts; both routes import it |
| Barber notification email fails silently | Expected — it's fire-and-forget via after(). Log error to error_logs; no retry |
| Existing appointments stuck as `Unassigned` | Banner on /agenda first time after deploy: "X appointments need barber assignment" |
| Storage bucket policies wrong → photos leak or fail | Test owner upload + cross-tenant denial before shipping Phase 1 |
| Slot helper rewrite breaks single-barber backwards behaviour | Keep `getStartableSlots` as thin wrapper calling per-barber version with shop-wide hours |
| preferred_barber_id points to deactivated barber | BookingForm filters active barbers only; pre-selection is silently skipped if barber inactive |

---

## Out of scope (defer to later)

- Per-barber Twilio numbers / SMS notifications (cost)
- Per-barber commission % and auto-calculated payout
- Per-barber loyalty programs
- Barber login (read-only or otherwise)
- Public barber profile pages (`/barbers/[slug]`)
- Drag-to-reorder appointments between barbers (only manual reassign)
- Calendar export (.ics) per barber
- Barber-specific service offerings (all barbers offer all services; price_modifier handles pricing diff)
- Round-robin vs least-loaded toggle (least-loaded is the default and covers 95% of cases)

---

## Execution checklist

### Phase 1+2 session (target: 6h)
- [ ] Apply 4 migrations via MCP (barbers, appts barber_id, time_blocks barber_id, clients preferred_barber_id)
- [ ] Create Storage bucket + policies
- [ ] Update `lib/supabase/types.ts`
- [ ] Write `lib/barbers.ts` (barberPhotoUrl, effectiveHoursForBarber, applyPriceModifier)
- [ ] Refactor SettingsForm → tabbed; add BarbersTab with CRUD + photo upload + email + price_modifier
- [ ] Write `/api/barbers/*` routes (5 endpoints)
- [ ] Write `/api/book/barbers` public endpoint
- [ ] Write `/api/book/client-preference` public endpoint
- [ ] Extend `/api/book/slots` with `barber_id` param + "any" logic
- [ ] Extend `/api/book` with auto-assign, price_modifier, preferred_barber update, barber email notification
- [ ] Extend `/api/appointments/create` and `/api/walkin` with barber_id + price_modifier + preferred_barber update + email
- [ ] Add barber picker step to `BookingForm` (with preferred_barber pre-selection + price hint)
- [ ] Update SMS strings with barber name
- [ ] tsc + build pass
- [ ] Manual smoke test: create 2 barbers, book "any" (check least-loaded), book specific, verify email notification, verify price_modifier applied

### Phase 3+4 session (target: 3.5h)
- [ ] `AppointmentsTodayTable` barber column + reassign
- [ ] `WeeklyAgenda` filter + color borders
- [ ] `NewAppointmentButton` + `WalkInButton` barber dropdown
- [ ] Dashboard "Revenue by barber" card (revenue + visit count)
- [ ] Per-barber hours override in slot helper
- [ ] BlockTimeButton barber dropdown
- [ ] CLAUDE.md update (migrations, tables, routes, decisions)
- [ ] tsc + build pass
- [ ] Final regression sweep

---

## Useful references inside the repo

- Slot logic to extend: `lib/slots.ts`
- Booking validation patterns: `app/api/book/route.ts`
- Settings tabs pattern (none exists yet): `components/dashboard/SettingsForm.tsx`
- Existing CRUD + RLS pattern: `app/api/time-blocks/` (just shipped, good reference)
- Tenant config validator (model for barber field validation): `lib/tenant-config.ts`
- Resend email pattern: `app/api/cron/reminders/route.ts`
- fire-and-forget pattern: `app/api/book/route.ts` (owner notification email)
