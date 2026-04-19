# Roadmap — BarberPro

## Estructura del proyecto

```
BarberSAAS/
├── app/
│   ├── (landing)/                  # Rutas públicas — barberpro.ca
│   │   ├── page.tsx                # Landing principal
│   │   └── layout.tsx
│   ├── (dashboard)/                # Rutas privadas — [slug].barberpro.ca
│   │   ├── page.tsx                # Vista principal del día
│   │   ├── clients/                # Gestión de clientes
│   │   ├── loyalty/                # Programa de lealtad
│   │   └── settings/               # Config del barbero
│   ├── api/
│   │   ├── dashboard/              # GET — datos del dashboard por tenant
│   │   ├── noshow/                 # POST — activa flujo no-show
│   │   ├── loyalty/
│   │   │   └── add/                # POST — suma puntos
│   │   ├── clients/
│   │   │   └── reactivate/         # POST — SMS a inactivos
│   │   ├── reviews/
│   │   │   └── request/            # POST — solicita reseña
│   │   └── webhooks/
│   │       └── twilio/             # POST — SMS entrantes
│   └── layout.tsx
├── components/
│   ├── ui/                         # shadcn/ui (auto-generado)
│   ├── dashboard/
│   │   ├── AppointmentCard.tsx     # Tarjeta de cita + botón Completado
│   │   ├── DayView.tsx             # Lista de citas del día
│   │   └── StatsBar.tsx            # Métricas rápidas
│   ├── clients/
│   │   ├── ClientCard.tsx
│   │   └── ClientHistory.tsx
│   └── loyalty/
│       └── LoyaltyBadge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Supabase browser client
│   │   ├── server.ts               # Supabase server client
│   │   └── types.ts                # Tipos generados (supabase gen types)
│   ├── twilio.ts                   # Cliente Twilio
│   ├── resend.ts                   # Cliente Resend
│   ├── anthropic.ts                # Cliente Claude API
│   └── n8n.ts                      # Helpers para disparar workflows
├── middleware.ts                   # Detección de subdominio → tenant
├── supabase/
│   └── migrations/                 # Migraciones SQL
├── .env
├── .env.local                      # Credenciales reales (no en git)
├── .gitignore
├── CLAUDE.md
├── README.md
└── ROADMAP.md
```

---

## Fases

### Fase 1 — Fundación
> Objetivo: proyecto corriendo en local con auth y DB funcionales

- [ ] Scaffold Next.js 14 + TypeScript + Tailwind + shadcn/ui
- [ ] Middleware de subdominio (detección de tenant)
- [ ] Schema SQL completo con RLS
  - [ ] `tenants`
  - [ ] `clients`
  - [ ] `visits`
  - [ ] `loyalty_points`
  - [ ] `messages`
  - [ ] `automations_config`
  - [ ] `actions_log`
- [ ] Supabase Auth (magic link)
- [ ] Tipos TypeScript generados desde Supabase

---

### Fase 2 — Dashboard del barbero
> Objetivo: el barbero puede ver sus citas y marcarlas como completadas

- [ ] Vista del día — lista de citas con botón "Completado"
- [ ] Botón "Completado" dispara:
  - [ ] Suma puntos de lealtad
  - [ ] Agenda solicitud de reseña (30 min delay)
  - [ ] Actualiza historial del cliente
- [ ] Vista de clientes con historial
- [ ] Métricas del dashboard (citas hoy, ingresos, puntos activos)
- [ ] API routes:
  - [ ] `GET /api/dashboard`
  - [ ] `POST /api/loyalty/add`
  - [ ] `POST /api/reviews/request`

---

### Fase 3 — Automatizaciones SMS
> Objetivo: los 5 workflows de n8n funcionando con Twilio

- [ ] Configurar n8n en Railway
- [ ] Workflow 1 — No-show
- [ ] Workflow 2 — Lealtad (notificación de nivel)
- [ ] Workflow 3 — Reactivación (cron semanal, 30+ días inactivos)
- [ ] Workflow 4 — Reseñas (30-60 min post-visita)
- [ ] Workflow 5 — Auto-respuesta con Claude API
- [ ] Webhook Twilio → `/api/webhooks/twilio`
- [ ] API routes:
  - [ ] `POST /api/noshow`
  - [ ] `POST /api/clients/reactivate`

---

### Fase 4 — Landing pública
> Objetivo: barberpro.ca convierte visitantes en clientes

- [ ] Landing page con propuesta de valor
- [ ] Formulario de registro de nueva barbería
- [ ] Flujo de onboarding (crear tenant + subdominio + magic link)
- [ ] Página de pricing ($10/mes)

---

### Fase 5 — Deploy y producción
> Objetivo: app en vivo con dominio, SSL y monitoreo

- [ ] Deploy en Vercel
- [ ] Dominio `barberpro.ca` + wildcard DNS (`*.barberpro.ca`)
- [ ] Variables de entorno en Vercel
- [ ] Supabase en producción
- [ ] n8n en Railway (producción)
- [ ] Tests E2E con Playwright (flujo crítico: login → cita → Completado)

---

## Estado actual

| Fase | Estado |
|------|--------|
| Fase 1 — Fundación | 🔲 Pendiente |
| Fase 2 — Dashboard | 🔲 Pendiente |
| Fase 3 — Automatizaciones | 🔲 Pendiente |
| Fase 4 — Landing | 🔲 Pendiente |
| Fase 5 — Deploy | 🔲 Pendiente |
