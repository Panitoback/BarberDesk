# BarberQueue — feature backlog

Curated list of high-leverage features for independent barbers. Ordered by
value/effort ratio. Not committed scope — pick + plan when ready.

---

## 1. Time blocking (vacations / lunch / sick day)
**Pain:** Today there's no way to block slots short of cancelling each
appointment one by one. First feature any barber asks for after 2 weeks of use.

**Sketch:**
- New table `time_blocks(id, tenant_id, date, start_time, end_time, reason text NULL, all_day boolean)`
- `lib/slots.ts` → `getSlotsForDate()` filters out any slot whose start falls
  inside a block for that date
- New `/dashboard/agenda` UI: click on empty slot → "Block this time" dialog;
  list view of upcoming blocks with delete
- API: `POST /api/time-blocks`, `DELETE /api/time-blocks/[id]`

**Effort:** ~3h. **Stickiness:** high.

---

## 2. Service duration
**Pain:** Every slot is hard-coded to 30 min. A 60-min "Full Service" only
blocks one slot → real risk of double-booking the back half. Latent bug.

**Sketch:**
- `Service` type gains `duration_min: 30 | 45 | 60 | 90`
- `/api/book/slots` returns slots with a `length_min` requirement when service
  is known; client sends the chosen service so we can subtract longer blocks
  from `slots`
- Slot generator returns slots that have enough consecutive free time for the
  requested duration
- `appointments` could store `duration_min` snapshot (not strictly needed if
  we always resolve from service, but useful for legacy)

**Effort:** ~2h. **Stickiness:** medium (silent reliability win).

---

## 3. Private notes per client
**Pain:** Every barber wants "prefers fade #2, allergic to product X, brings
his kid". Currently there's no field for it.

**Sketch:**
- `clients.notes text NULL` column
- Editable text area on `/clients/[id]` (autosave or save button)
- Display on the day's appointment card so it's visible when the client walks in

**Effort:** ~1h. **Stickiness:** very high (used daily).

---

## 4. End-of-day summary (SMS + email)
**Pain:** Barber wants to know the day's numbers without opening the app.

**Sketch:**
- New n8n cron at each tenant's `close` time per weekday (or a single daily
  cron at e.g. 20:00 Toronto that fans out per tenant)
- API `GET /api/cron/daily-summary` → for each tenant, computes today's
  completed/no-show/revenue and pushes via Resend + Twilio
- Toggle in `automations_config.daily_summary_active`

**Effort:** ~3h. **Stickiness:** very high (daily touchpoint).

---

## 5. Photo gallery on public booking page
**Pain:** Barbers love showing their work. Conversion booster for the booking
page — visitor scrolls, sees real cuts, books.

**Sketch:**
- Supabase Storage bucket `tenant-gallery` (RLS: owner uploads only, public
  read)
- New `/dashboard/gallery` UI: drag-and-drop upload, reorder, delete
- `tenants.config.gallery_image_paths text[]` (just paths, not full URLs)
- Render carousel/grid above the form on `/book`

**Effort:** ~4h. **Stickiness:** medium (conversion win, not daily use).

---

## Recommended cohorting

- **Sprint A (one session):** #1 + #2 + #3 → ~6h, fixes real pain in three
  different surfaces, low coupling.
- **Sprint B (later):** #4 once Sprint A ships and you've validated the n8n
  pattern works.
- **Sprint C (post-traction):** #5 when conversion of the public booking page
  starts mattering enough to optimize.
