# n8n Workflows — BarberPro

Three workflows for Phase 3 SMS automations, running on the n8n instance at
`https://n8n-production-1e0f.up.railway.app`.

> ⚠️ **The JSON files in this folder are outdated.** The live n8n instance is the
> source of truth. The committed JSONs still use `$env` expressions and the old
> HTTP-Request design for workflow 03 — they will be re-exported once the live
> workflows are verified.

---

## Important: n8n blocks `$env` access

n8n denies access to environment variables inside node expressions
(`[ERROR: access to env vars denied]`). **Secrets must live in n8n Credentials**,
not in `$env.*` expressions.

---

## Setup (one-time)

### 1. Create n8n credentials

**Bearer Auth — for calls to the BarberPro API**

n8n UI → Credentials → New → **Header Auth / Bearer Auth**:

| Field | Value |
|-------|-------|
| Name | `Barber Pro webhook` |
| Bearer Token | the `WEBHOOK_SECRET` value from `barberdesk/.env` (token only, no `Bearer ` prefix) |

Every HTTP Request node that calls `barberpro.ca/api/*` uses this credential
(Authentication → Generic Credential Type → Bearer Auth).

**OpenRouter — for the AI Agent**

The `OpenRouter Chat Model` node in workflow 03 has its own credential holding the
`OPENROUTER_API_KEY`.

### 2. Import workflows

For each JSON file:
1. n8n UI → Workflows → top-right `+` → **Import from File**
2. Select the JSON
3. Re-attach the credentials (imports don't carry them)
4. Save (Ctrl+S) and toggle **Activate**

### 3. Copy webhook URLs and fill `.env`

After activating workflows 01 and 03, copy the **Production URL** from each Webhook
node into `barberdesk/.env`:

```
N8N_REVIEW_WEBHOOK_URL=https://n8n-production-1e0f.up.railway.app/webhook/review-delay
N8N_AUTOREPLY_WEBHOOK_URL=https://n8n-production-1e0f.up.railway.app/webhook/autoreply
```

Workflow 02 has no webhook (scheduled trigger).

### 4. Configure Twilio inbound webhook

Twilio Console → Phone Numbers → your number → Messaging:
- **A MESSAGE COMES IN**: Webhook
- **URL**: `https://barberpro.ca/api/webhooks/twilio`
- **Method**: HTTP POST

---

## Workflows

### 01 · Review Request (30-min delay)

`Webhook → Wait 30 min → POST /api/reviews/request`

- **Triggered by**: `POST /api/appointments/complete` (after a barber clicks "Complete")
- **Receives**: `{ client_id, subdomain, completed_at }`
- **Sends**: Google review SMS 30 minutes after the appointment is completed
- **Skipped if**: `automations_config.review_active = false` or `review_link` is null

### 02 · Weekly Reactivation Cron

`Schedule (Mon 9am) → POST /api/cron/reactivate`

- **Triggered by**: Cron — every Monday at 09:00 (UTC by default on Railway)
- **Sends**: SMS + email (via Resend) to clients inactive for `reactivation_days` (default 30)
- **Skipped if**: tenant has `reactivation_active = false`
- **Dedup**: clients who already got an SMS within the same window are skipped

### 03 · AI Auto-Reply (Inbound SMS)

`Webhook → AI Agent → POST /api/messages/send`

- **Triggered by**: `POST /api/webhooks/twilio` after persisting the inbound SMS
- **Receives**: `{ tenant_id, subdomain, shop_name, from_number, client_name, message }`
- **AI Agent**: native n8n node with two sub-nodes:
  - **OpenRouter Chat Model** — model selectable (e.g. `anthropic/claude-3.5-haiku`)
  - **Simple Memory** — session keyed by `{{ $json.body.from_number }}`
- **Sends**: AI-generated reply via `/api/messages/send` (logged to `messages`)

#### Field mapping (important)

The n8n Webhook node receives the payload **from the Next.js API**, not from Twilio
directly. n8n wraps the POST body under `body`, so use:

| Node / field | Expression |
|--------------|------------|
| AI Agent → Prompt (User Message) | `{{ $json.body.message }}` |
| Simple Memory → Key (Session ID) | `{{ $json.body.from_number }}` |
| Send SMS Reply → `to_number` | `{{ $('Webhook').first().json.body.from_number }}` |
| Send SMS Reply → `subdomain` | `{{ $('Webhook').first().json.body.subdomain }}` |
| Send SMS Reply → `message` | `{{ $json.output }}` (AI Agent output) |

---

## Testing

### Workflow 01 (review delay)
1. Mark an appointment as complete in the dashboard
2. Check the n8n execution log — webhook hit + 30-min wait

Shorten the wait for testing: edit the Wait node → 1 minute → save.

### Workflow 02 (reactivation cron)
1. Open workflow 02 → click the Schedule Trigger node → **Execute Node**
2. Check Supabase `messages` table for new outbound rows

### Workflow 03 (AI auto-reply)
Send an SMS to the Twilio number. Within seconds:
1. Twilio → Next.js webhook → message saved (`direction: inbound`)
2. Next.js → n8n webhook → AI Agent → reply SMS saved (`direction: outbound`)

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| `[ERROR: access to env vars denied]` | Using `$env.*` in an expression — use a credential instead |
| Workflow 01/03 never triggers | `N8N_REVIEW_WEBHOOK_URL` / `N8N_AUTOREPLY_WEBHOOK_URL` not set in `.env`, or workflow not Active |
| HTTP Request returns 401 | `WEBHOOK_SECRET` in the n8n credential doesn't match `barberdesk/.env` |
| AI Agent gets an empty prompt | Wrong field reference — must be `{{ $json.body.message }}` |
| Reply SMS not sent | `to_number` must be `{{ $('Webhook').first().json.body.from_number }}` |
| OpenRouter returns 401 | OpenRouter credential missing/invalid on the Chat Model node |
| Twilio webhook returns 403 | Signature mismatch — webhook URL in Twilio Console must exactly match `${NEXT_PUBLIC_APP_URL}/api/webhooks/twilio` (no trailing slash) |
| Reactivation email fails silently | Resend domain not verified — emails work only after `barberpro.ca` is verified in Resend. SMS still goes through. |
