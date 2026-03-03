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
PERFECT_WEEK_ONBOARDING_GROUP_ID=153400728188094209
PERFECT_WEEK_GROUP_NAME=Perfect Week Leads
PERFECT_WEEK_FORM_SOURCE=Perfect Week
PERFECT_WEEK_SENDER_NAME="Alejandro Gómez"
```

Notas:
- `PERFECT_WEEK_ONBOARDING_GROUP_ID` tiene default `153400728188094209` si no se define.
- `PERFECT_WEEK_GROUP_ID` sí es obligatorio.

## Crear (o reutilizar) grupo de Perfect Week en MailerLite

Ejecutar una sola vez:

```bash
node scripts/create-perfect-week-group.mjs
```

El script devuelve JSON con `id` y `name` del grupo (sin imprimir secretos). Copia ese `id` en `PERFECT_WEEK_GROUP_ID`.

## Desarrollo local

```bash
npm run dev
```

Abrir: `http://localhost:3000/perfect-week`

## Deploy en Vercel

```bash
npx vercel deploy --prod --token $VERCEL_ACCESS_TOKEN
```
