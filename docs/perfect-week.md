# Perfect Week quick launch

## Rutas

- Landing pública: `/perfect-week`
- Privacidad: `/perfect-week/privacy`
- API de captura: `POST /api/perfect-week/lead`

## Variables de entorno

Agregar en `.env.local` / Vercel:

```bash
MAILERLITE_API_KEY=...
PERFECT_WEEK_GROUP_ID=123456789012345678
PERFECT_WEEK_EMAIL0_GROUP_ID=153400728188094209
PERFECT_WEEK_ONBOARDING_GROUP_ID=154049618670257330
PERFECT_WEEK_HANDOFF_DELAY_HOURS=24
PERFECT_WEEK_HANDOFF_CRON_SECRET=... # opcional, para invocación manual
PERFECT_WEEK_GROUP_NAME=Perfect Week Leads
PERFECT_WEEK_FORM_SOURCE=Perfect Week
PERFECT_WEEK_SENDER_NAME="Alejandro Gómez"
```

Notas:
- `PERFECT_WEEK_EMAIL0_GROUP_ID` = grupo de espera/disparador de **Email 0**.
- `PERFECT_WEEK_ONBOARDING_GROUP_ID` = grupo que inicia la secuencia de **Notes de Alejandro**.
- `PERFECT_WEEK_GROUP_ID` sí es obligatorio.
- `PERFECT_WEEK_HANDOFF_DELAY_HOURS` default 24.

## Crear (o reutilizar) grupo de Perfect Week en MailerLite

Ejecutar una sola vez:

```bash
node scripts/create-perfect-week-group.mjs
```

El script devuelve JSON con `id` y `name` del grupo (sin imprimir secretos). Copia ese `id` en `PERFECT_WEEK_GROUP_ID`.

## Handoff diferido (≈24h)

- API de handoff: `GET/POST /api/perfect-week/handoff`
- Scheduler recomendado: **cron-job.org** cada hora (plan Hobby de Vercel no permite cron >1/día).
- La ruta acepta:
  - invocación interna de Vercel Cron (`x-vercel-cron: 1`), o
  - `Authorization: Bearer $PERFECT_WEEK_HANDOFF_CRON_SECRET` (o query `?token=`), útil para scheduler externo y pruebas.

Prueba manual:

```bash
curl -X POST "https://<tu-dominio>/api/perfect-week/handoff" \
  -H "Authorization: Bearer $PERFECT_WEEK_HANDOFF_CRON_SECRET"
```

Configuración exacta en cron-job.org:
1. URL: `https://<tu-dominio>/api/perfect-week/handoff`
2. Método: `POST`
3. Frecuencia: `0 * * * *` (cada hora)
4. Header: `Authorization: Bearer <PERFECT_WEEK_HANDOFF_CRON_SECRET>`

## Paso manual único (siempre necesario en MailerLite)

La API no crea ni publica automations de MailerLite, así que **Email 0** debe quedar configurado en UI una sola vez:

1. MailerLite → **Automations** → **Create workflow**.
2. Trigger: **When subscriber joins group** = `PERFECT_WEEK_EMAIL0_GROUP_ID`.
3. Primer bloque: **Email** (este es Email 0), envío inmediato.
4. Publicar la automation.

Con eso, el flujo queda así:
- alta en `/api/perfect-week/lead` → entra a grupo Perfect Week + grupo Email 0,
- recibe Email 0,
- ~24h después el cron lo mueve al grupo de onboarding (`PERFECT_WEEK_ONBOARDING_GROUP_ID`).

## Desarrollo local

```bash
npm run dev
```

Abrir: `http://localhost:3000/perfect-week`

## Deploy en Vercel

```bash
npx vercel deploy --prod --token $VERCEL_ACCESS_TOKEN
```
