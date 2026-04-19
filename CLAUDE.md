# BarberPro — CLAUDE.md

## Qué es este proyecto

Micro-SaaS para barberías independientes en Toronto, Canada.
Precio: $10 USD/mes por barbería.
Stack: Next.js 14 + TypeScript + Tailwind + shadcn/ui + Supabase + n8n + Twilio.

---

## Reglas de arquitectura (SIEMPRE aplicar)

### Multi-tenancy — la regla más importante
- Toda tabla tiene `tenant_id` — sin excepción
- Toda query filtra por `tenant_id` — sin excepción
- Nunca se mezclan datos entre barberías
- RLS activo en todas las tablas de Supabase

### Separación frontend / backend
```
app/api/          → lógica de negocio, queries a Supabase
app/components/   → solo UI, sin lógica de negocio
app/lib/          → helpers, clients, tipos compartidos
```

### Subdominio routing
```
barberpro.ca                  → landing pública
[slug].barberpro.ca           → dashboard privado del barbero
```
El middleware de Next.js detecta el subdominio y carga el tenant correcto.

---

## Stack técnico

- **Lenguaje:** TypeScript en todo — frontend y backend
- **Frontend:** Next.js 14 App Router + React + Tailwind + shadcn/ui
- **Backend:** Next.js API Routes (serverless) + Supabase Edge Functions
- **Base de datos:** PostgreSQL via Supabase con RLS
- **Auth:** Supabase Auth (magic link)
- **Automatizaciones:** n8n self-hosted en Railway
- **SMS:** Twilio (un número por barbero)
- **Email:** Resend
- **IA:** Claude API (claude-sonnet-4-6) para respuestas automáticas
- **Deploy:** Vercel (Next.js) + Railway (n8n) + Supabase (DB)

---

## Schema de base de datos

```sql
-- Tabla raíz — todo parte de aquí
tenants (id, nombre, subdominio, twilio_number, config, plan, created_at)

-- Clientes de cada barbería
clients (id, tenant_id, nombre, telefono, email, no_show_count, ultima_visita)

-- Historial de visitas
visits (id, tenant_id, client_id, fecha, servicio, puntos_ganados)

-- Programa de lealtad
loyalty_points (id, tenant_id, client_id, puntos, nivel)

-- Historial de SMS
messages (id, tenant_id, client_id, direccion, contenido, estado, created_at)

-- Config de automatizaciones por barbero
automations_config (id, tenant_id, noshow_active, loyalty_active, review_active)

-- Log de acciones
actions_log (id, tenant_id, client_id, tipo, metadata, created_at)
```

---

## API Routes principales

```
POST /api/noshow          → activa flujo de no-show
POST /api/loyalty/add     → suma puntos al cliente
POST /api/clients/reactivate → detecta y manda SMS a inactivos
POST /api/reviews/request → solicita reseña en Google
POST /api/webhooks/twilio → recibe SMS entrantes de Twilio
GET  /api/dashboard       → datos del dashboard por tenant
```

---

## Automatizaciones (n8n)

Cada workflow lee `tenant_id` y carga la config específica de esa barbería.

1. **No-show:** SMS del barbero → pregunta si activa oferta → manda a clientes elegibles
2. **Lealtad:** post-visita → suma puntos → notifica al cliente si sube de nivel
3. **Reactivación:** cron semanal → detecta inactivos 30+ días → SMS personalizado
4. **Reseñas:** post-visita → espera 30-60 min → SMS con link de Google Reviews
5. **Auto-respuesta:** SMS entrante → Claude API con contexto de la barbería → respuesta

---

## Reglas de código

- Siempre TypeScript — nunca JS puro
- Siempre validar `tenant_id` en cada API route antes de cualquier query
- Siempre usar tipos generados de Supabase — nunca `any`
- Componentes React sin lógica de negocio — solo props y UI
- Variables de entorno en `.env.local` — nunca hardcodear keys

---

## Comandos útiles

```bash
supabase db push          # aplicar migraciones
supabase gen types        # regenerar tipos TypeScript
vercel dev                # correr en local con Vercel
npx shadcn-ui add [comp]  # agregar componente de shadcn
```

---

## Lo que NO hacer

- No integrar Square API ahora (el barbero reporta manualmente)
- No usar WhatsApp Business API ahora (migración futura desde SMS)
- No poner lógica de negocio en componentes React
- No crear tablas sin `tenant_id`
- No usar Alembic (es Python — Supabase tiene sus propias migraciones)
- No hardcodear tenant_ids ni API keys

---

## Skills instaladas

- `supabase/agent-skills` → RLS, migraciones, queries multi-tenant (auto)
- `czlonkowski/n8n-skills` → workflows, expresiones, validación (auto)
- `alirezarezvani/engineering-skills` → arquitectura, debugging (auto)
- `anthropics/frontend-design` → diseño UI (invocar con /frontend-design)
- `testdino-hq/playwright` → tests de UI (invocar con /playwright)