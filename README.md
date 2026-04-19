# BarberPro

Micro-SaaS para barberías independientes en Toronto, Canada.
Cada barbería obtiene su propio subdominio, dashboard móvil y automatizaciones de SMS.

**Precio:** $10 USD/mes por barbería

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 + TypeScript + Tailwind + shadcn/ui |
| Backend | Next.js API Routes + Supabase Edge Functions |
| Base de datos | PostgreSQL via Supabase (RLS activo) |
| Auth | Supabase Auth — magic link |
| SMS | Twilio |
| Email | Resend |
| Automatizaciones | n8n self-hosted en Railway |
| IA | Claude API (claude-sonnet-4-6) |
| Deploy | Vercel + Railway + Supabase |

---

## Subdominio routing

```
barberpro.ca              → landing pública
[slug].barberpro.ca       → dashboard privado del barbero
```

---

## Automatizaciones incluidas

1. **No-show** — SMS automático con oferta de recuperación
2. **Lealtad** — puntos post-visita + notificación de nivel
3. **Reactivación** — detecta clientes inactivos 30+ días y manda SMS
4. **Reseñas** — solicitud automática 30 min después de la visita
5. **Auto-respuesta** — responde SMS entrantes con IA (Claude)

---

## Variables de entorno

Copia `.env` a `.env.local` y llena los valores:

```bash
cp .env .env.local
```

Ver `.env` para la lista completa de variables requeridas.

---

## Comandos

```bash
npm run dev               # desarrollo local
supabase db push          # aplicar migraciones
supabase gen types        # regenerar tipos TypeScript
vercel dev                # desarrollo con Vercel CLI
npx shadcn-ui add [comp]  # agregar componente shadcn
```

---

## Arquitectura multi-tenant

- Toda tabla tiene `tenant_id` — sin excepción
- Toda query filtra por `tenant_id` — sin excepción
- RLS activo en todas las tablas
- Los datos de cada barbería nunca se mezclan

---

## Roadmap

Ver [ROADMAP.md](ROADMAP.md)
